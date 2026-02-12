# Feature: Date Prepopulate (Status Date Auto-Fill on Edit)

## Introduction

When a user enters edit mode on an empty `statusDate` cell, the input field should be prepopulated with today's date in `M/D/YYYY` format. This eliminates repetitive manual date entry for the most common workflow: entering today's date as the status date when updating a measure's status. The prepopulated date is confirmed by pressing Tab or Enter, or can be replaced by simply typing a new date. If the cell already has a date, normal edit behavior applies with no prepopulation.

This feature only applies to the `statusDate` column. Other date columns (`memberDob`, `dueDate`) are not affected. The `dueDate` column is not editable, and `memberDob` has its own distinct workflow (masked display, required field).

## Alignment with Product Vision

The product vision states the system "replaces Excel-based workflows." In Excel, users frequently type today's date by pressing Ctrl+; (semicolon). The Patient Tracker has no keyboard shortcut for this, requiring users to manually type the full date every time they set a status date -- which, in the overwhelming majority of cases, is today's date. This feature provides an equivalent convenience that reduces data entry time, minimizes typos, and mirrors the speed of the Excel workflow it replaces. It directly supports the success metric of reducing manual entry friction.

## Requirements

> **Note:** This feature is entirely frontend. No backend API changes are needed. The `statusDate` column already accepts date values via the existing cell editing pipeline (valueSetter with `parseAndValidateDate`). The prepopulation logic occurs in the AG Grid cell editor layer before the value reaches the valueSetter.

---

### Requirement 1: Prepopulate Empty Status Date with Today's Date

**ID:** DP-R1

**User Story:** As a staff member updating a patient's measure status, I want the Status Date field to automatically show today's date when I start editing an empty cell, so that I can quickly confirm it without typing the full date manually.

#### Acceptance Criteria

- DP-R1-AC1: WHEN the user enters edit mode on a `statusDate` cell that is currently empty (null or empty string), THEN the text input SHALL be prepopulated with today's date in `M/D/YYYY` format (no leading zeros, matching the existing `formatDateForEdit` function output).
- DP-R1-AC2: WHEN the cell is prepopulated with today's date, THEN the entire text content SHALL be selected (highlighted), so that any keystroke replaces the prepopulated value.
- DP-R1-AC3: WHEN the user enters edit mode on a `statusDate` cell that already contains a date value, THEN the cell SHALL behave exactly as it does today (show the existing date in `M/D/YYYY` format for editing, no prepopulation, no auto-selection).
- DP-R1-AC4: The prepopulated date SHALL use the user's local system date (via `new Date()`), not a server-provided date. This matches the existing pattern where `formatDateForEdit` uses the JavaScript `Date` constructor.
- DP-R1-AC5: This behavior SHALL apply ONLY to the `statusDate` column. No other date columns (`memberDob`, `dueDate`) SHALL be affected.

---

### Requirement 2: Confirm Prepopulated Date via Tab or Enter

**ID:** DP-R2

**User Story:** As a staff member, I want to confirm today's date by simply pressing Tab or Enter after the cell opens, so that I can move through rows quickly.

#### Acceptance Criteria

- DP-R2-AC1: WHEN the `statusDate` cell is in edit mode with the prepopulated today's date and the user presses Enter, THEN the prepopulated date SHALL be confirmed (saved) as the cell's value.
- DP-R2-AC2: WHEN the `statusDate` cell is in edit mode with the prepopulated today's date and the user presses Tab, THEN the prepopulated date SHALL be confirmed (saved) as the cell's value, and focus SHALL move to the next cell (standard Tab behavior).
- DP-R2-AC3: WHEN the user confirms the prepopulated date, THEN the standard `onCellValueChanged` handler SHALL fire with the new ISO date value, triggering the auto-save pipeline (PUT request to backend, due date recalculation, row color update).
- DP-R2-AC4: WHEN the user presses Escape while the prepopulated date is shown, THEN the edit SHALL be cancelled and the cell SHALL return to its previous state (empty).

---

### Requirement 3: Clear Prepopulated Date on Number Keystroke

**ID:** DP-R3

**User Story:** As a staff member entering a date other than today, I want the prepopulated date to disappear when I start typing a number, so that I can enter my own date without having to manually select and delete the default.

#### Acceptance Criteria

- DP-R3-AC1: WHEN the `statusDate` cell is in edit mode with the prepopulated (fully selected) date and the user types a digit (0-9), THEN the prepopulated text SHALL be replaced with the typed digit (standard browser behavior for selected text -- typing replaces selection).
- DP-R3-AC2: WHEN the user types any other character (letters, slash, dash, dot, etc.) while the text is selected, THEN the prepopulated text SHALL also be replaced (standard input behavior when text is selected).
- DP-R3-AC3: WHEN the user clicks within the prepopulated text to position the cursor (deselecting the text), THEN the prepopulated date SHALL remain visible and the user can edit it inline (cursor placement, not full replacement). This is standard text input behavior.
- DP-R3-AC4: The select-all behavior (DP-R1-AC2) is what enables the "type to replace" UX. No special keydown handler is needed to clear the field -- the browser's native behavior of replacing selected text on keystroke provides this functionality.

---

### Requirement 4: Visual Indication of Prepopulated State (Optional Enhancement)

**ID:** DP-R4

**User Story:** As a staff member, I want to visually distinguish a prepopulated date from one I manually entered, so that I know the value was auto-filled and I can choose to modify it.

#### Acceptance Criteria

- DP-R4-AC1: WHEN the `statusDate` cell enters edit mode with a prepopulated date, THEN the input text MAY be styled with a lighter text color (e.g., `#999`) to indicate it is a suggestion, not a confirmed value.
- DP-R4-AC2: WHEN the user types or confirms the value (Tab/Enter), THEN the text color SHALL revert to normal (black/default).
- DP-R4-AC3: This requirement is OPTIONAL (MAY) and SHALL NOT block the implementation of DP-R1 through DP-R3. It can be deferred to a future enhancement.

---

## Non-Functional Requirements

### NFR-1: Performance
- The prepopulation SHALL add no perceptible delay to entering edit mode. Computing `new Date()` and formatting it is sub-millisecond.

### NFR-2: Accessibility
- The prepopulated input SHALL be fully accessible via keyboard (Tab, Enter, Escape, typing). Screen readers SHALL announce the prepopulated value when the input receives focus.

### NFR-3: Compatibility with Existing Features
- The prepopulation SHALL NOT interfere with:
  - The status date prompt text (gray italic "Date Completed" etc.) shown in non-edit mode
  - The `parseAndValidateDate` function used by the valueSetter
  - The cascading field clearing logic (measureStatus change clears statusDate)
  - Real-time collaborative editing (remote edit indicators, conflict detection)
  - The existing date formatting/display logic

---

## Out of Scope

- **Other date columns**: Only `statusDate` is affected. `memberDob` and `dueDate` are not changed.
- **Date picker widget**: This feature uses the existing text input. A calendar/date-picker component is a separate future feature.
- **Configurable default date**: The prepopulated date is always "today." Making it configurable (e.g., "yesterday," "last Monday") is out of scope.
- **Backend changes**: No API, database, or schema changes are needed. The feature is entirely frontend.
- **Mobile-specific behavior**: The existing AG Grid is desktop-focused. Mobile date input handling is out of scope.

---

## Open Questions

None -- the requirements are fully specified. All edge cases are covered by the existing AG Grid cell editing infrastructure (valueSetter, valueGetter, onCellValueChanged).

---

## Glossary

| Term | Definition |
|------|-----------|
| statusDate | The date when a measure status was set (e.g., "Date Completed," "Date Ordered"). Column field name: `statusDate`. |
| prepopulate | Automatically fill in a form field with a default value when it enters edit mode. |
| valueSetter | AG Grid callback that transforms raw input into the data model value. The existing `parseAndValidateDate` function handles date format conversion and validation. |
| valueGetter | AG Grid callback that transforms the data model value into the displayed/edited value. The existing `formatDateForEdit` function handles date formatting. |
