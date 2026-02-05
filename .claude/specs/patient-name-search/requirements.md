# Requirements: Patient Name Search

## Introduction

Add a quick search/filter input that allows users to filter the patient grid by patient name. This is a client-side search that filters the already-loaded dataset in real-time as the user types, following the same pattern as the existing status color filter. The search bar will be positioned alongside the existing StatusFilterBar for a cohesive filtering experience.

## Alignment with Product Vision

From product.md: The system replaces Excel-based workflows for medical offices. Excel has Ctrl+F search built in. Adding patient name search provides the same quick-find capability users expect, improving usability when physicians have many patients. This directly supports the "real-time compliance visibility" success metric by helping users quickly locate specific patients.

## Requirements

### Requirement 1: Search Input UI

**User Story:** As a physician/staff/admin, I want a search box on the main page so that I can quickly find a specific patient by name.

#### Acceptance Criteria

1. WHEN the main page loads THEN the system SHALL display a search input field in the filter bar area, to the right of the status color chips.
2. WHEN the search input is empty THEN the system SHALL show all rows (no name filtering applied).
3. WHEN the user clicks the search input THEN the system SHALL focus the input and allow typing.
4. The search input SHALL have placeholder text "Search by name..." to indicate its purpose.
5. The search input SHALL have a search icon (magnifying glass) on the left side.
6. WHEN the search input has text THEN the system SHALL show a clear (X) button on the right side to reset the search.
7. WHEN the user clicks the clear button THEN the system SHALL clear the search text and show all rows.

### Requirement 2: Client-Side Name Filtering

**User Story:** As a physician/staff/admin, I want the patient grid to filter instantly as I type a name so that I can find patients without waiting.

#### Acceptance Criteria

1. WHEN the user types in the search input THEN the system SHALL filter the grid rows to show only patients whose `memberName` contains the search text (case-insensitive).
2. WHEN the search text matches zero patients THEN the system SHALL show an empty grid (no rows).
3. WHEN the user clears the search text THEN the system SHALL restore all rows (respecting any active status color filter).
4. The search filtering SHALL be case-insensitive (e.g., "smith" matches "John Smith").
5. The search filtering SHALL support partial matches (e.g., "smi" matches "John Smith").
6. The search filtering SHALL work on any part of the name (e.g., "john" matches "John Smith", "smith" matches "John Smith").

### Requirement 3: Interaction with Status Color Filter

**User Story:** As a user, I want name search and status color filters to work together so that I can find a specific patient within a specific status group.

#### Acceptance Criteria

1. WHEN both a status color filter and search text are active THEN the system SHALL show only rows matching BOTH criteria (AND logic).
2. WHEN the user changes the status color filter THEN the system SHALL preserve the search text and re-apply both filters.
3. WHEN the user changes the search text THEN the system SHALL preserve the active status color filter and re-apply both filters.
4. The StatusFilterBar chip counts SHALL reflect the full dataset (not filtered by search text) to maintain consistent count visibility.

### Requirement 4: Row Count Updates

**User Story:** As a user, I want the status bar to show accurate row counts so that I know how many patients match my current filters.

#### Acceptance Criteria

1. WHEN search text is active THEN the StatusBar row count SHALL reflect the number of filtered rows (after both name search AND status color filter are applied).
2. WHEN search text is cleared THEN the StatusBar row count SHALL return to the full count (or status-color-filtered count if a color filter is active).

### Requirement 5: Keyboard Shortcuts

**User Story:** As a power user, I want keyboard shortcuts to quickly access the search box so that I can search without reaching for the mouse.

#### Acceptance Criteria

1. WHEN the user presses Ctrl+F (or Cmd+F on Mac) while not editing a cell THEN the system SHALL focus the search input.
2. WHEN the search input is focused and the user presses Escape THEN the system SHALL clear the search text and blur the input.

## Non-Functional Requirements

### Performance
- Search filtering SHALL respond within 100ms for datasets up to 5,000 rows (no debounce needed for client-side filtering).
- The search SHALL NOT cause unnecessary re-renders of the AG Grid (use memoization).

### Usability
- The search input SHALL be visually consistent with the existing filter bar styling (Tailwind CSS).
- The search input width SHALL be responsive (minimum 200px, maximum 300px).
- The clear button SHALL only appear when there is text in the input (not when empty).

### Accessibility
- The search input SHALL have an appropriate `aria-label` ("Search patients by name").
- The clear button SHALL have an `aria-label` ("Clear search").
