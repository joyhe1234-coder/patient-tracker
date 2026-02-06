# Patient Grid Page Guide

> **Route**: `/` (root page after login)
> **Component**: `MainPage.tsx` with AG Grid
> **URL**: `http://localhost:5173` (dev) or `http://localhost:3000` (Docker)

---

## Page Layout (top to bottom)

### 1. Header Bar
- Left: App title
- Center: **Physician Selector** dropdown (STAFF/ADMIN only)
  - STAFF: sees assigned physicians only
  - ADMIN: sees all physicians + "Unassigned patients" option
  - PHYSICIAN: no dropdown (auto-filtered to own patients)
- Right: User email + dropdown menu (Change Password, Logout)

### 2. Toolbar
- **Add Row** button (blue) - opens modal to add new patient
- **Duplicate Mbr** button (green) - duplicates selected row (disabled if no selection)
- **Delete Row** button (red) - deletes selected row with confirmation (disabled if no selection)
- **Member Info** toggle - show/hide DOB, Telephone, Address columns (hidden by default for privacy)
- **Save Indicator** (right): "Saving..." (yellow) → "Saved" (green, 2s) → disappears

### 3. Status Filter Bar
- Filter chips with counts: All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A
- Multi-select: click to toggle on/off, checkmark + fill when active
- "All" is default; "Duplicates" is exclusive (deselects status filters)
- **Search input** (right): search by patient name. Ctrl+F to focus, Escape to clear

### 4. AG Grid (main content)
- 14 columns, editable cells, single-click editing
- Auto-save on cell blur (Tab, Enter, click elsewhere)

### 5. Status Bar (bottom)
- "Showing X rows" or "Showing X of Y rows" when filtered

---

## Columns

| # | Column | Width | Editable | Type | Notes |
|---|--------|-------|----------|------|-------|
| 1 | Request Type | 130px | Yes | Dropdown | AWV, Chronic DX, Quality, Screening. Pinned left. |
| 2 | Member Name | 180px | Yes | Text | Pinned left. |
| 3 | Member DOB | 130px | Conditional | Date | Hidden by default. Masked as "###". |
| 4 | Member Telephone | 140px | Conditional | Text | Hidden by default. Formatted (555) 123-4567. |
| 5 | Member Home Address | 220px | Conditional | Text | Hidden by default. |
| 6 | Quality Measure | 200px | Yes | Dropdown | Options filtered by Request Type. |
| 7 | Measure Status | 220px | Yes | Dropdown | Options filtered by Quality Measure. |
| 8 | Status Date | 140px | Yes | Date | Shows contextual prompt when empty. |
| 9 | Tracking #1 | 160px | Conditional | Dropdown/Text | Depends on Measure Status. Shows N/A when disabled. |
| 10 | Tracking #2 | 150px | Conditional | Dropdown/Text | Depends on Measure Status. Shows N/A when disabled. |
| 11 | Tracking #3 | 150px | Yes | Text | Free text, always editable. |
| 12 | Due Date | 120px | No | Calculated | Status Date + Time Interval Days. |
| 13 | Time Interval (Days) | 150px | Conditional | Number | Editable for some statuses, locked when dropdown controls interval. |
| 14 | Notes | Flex | Yes | Text | Multi-line. |

---

## Row Colors (by Measure Status)

| Color | Hex | Statuses |
|-------|-----|----------|
| White | #FFFFFF | Not Addressed (default) |
| Yellow | #FFF9E6 | Patient called, Screening discussed, Vaccination discussed |
| Blue | #CCE5FF | Scheduled, Ordered, Referral made, In Progress |
| Green | #D4EDDA | Completed, At Goal, Confirmed |
| Purple | #E5D9F2 | Declined, Contraindicated |
| Orange | #FFE8CC | Chronic diagnosis resolved/invalid |
| Gray | #E9EBF3 | No longer applicable, Screening unnecessary |
| Red | #FFCDD2 | **Overdue** (dueDate < today) - overrides white/yellow/blue/green |

- **Duplicate indicator**: Orange 4px left border (#F97316), additive to status color
- **Priority**: Duplicate stripe > Overdue > Status color

---

## Use Cases to Review

### UC-1: Initial Page Load
- **PHYSICIAN**: Grid loads automatically with own patients, no selector visible
- **STAFF**: "Select a Physician" prompt, must pick from dropdown, then grid loads
- **ADMIN**: Same as STAFF but includes "Unassigned patients" option
- **Empty state**: Message when no patients
- **Error state**: "Failed to load patient data" with Retry button
- **Loading state**: Spinner while fetching

### UC-2: Row Selection
- Single-click row → blue outline border, status color preserved
- Duplicate/Delete buttons become enabled
- Single-select only (new click deselects previous)

### UC-3: Cell Editing - Text
- Single-click enters edit mode (blinking cursor)
- Tab/Enter/blur → auto-save → "Saving..." → "Saved" (2s)
- Supports: Member Name, Notes, Tracking #3

### UC-4: Cell Editing - Dates
- Accepts multiple formats: MM/DD/YYYY, M/D/YY, M.D.YYYY, YYYY-MM-DD, MMDDYYYY
- Display: always M/D/YYYY (no leading zeros)
- Invalid date → alert popup with accepted formats, value reverts
- Status Date shows contextual prompt when empty ("Date Completed", "Date Ordered", etc.)

### UC-5: Cell Editing - Dropdowns
- **Cascading clears**: Request Type → clears Quality Measure, Measure Status, and downstream
- Quality Measure → clears Measure Status and downstream
- Measure Status → clears Status Date, Tracking, Due Date, Time Interval
- Notes are NEVER cleared by cascading

### UC-6: Tracking Fields (Conditional)
- Tracking #1: Dropdown for some statuses (screening type, test type, time period), free text for HgbA1c, disabled ("N/A") for others
- Tracking #2: Dropdown for HgbA1c (1-12 months), free text for BP reading, disabled for others
- Disabled fields: gray diagonal stripe, not clickable

### UC-7: Due Date & Time Interval
- Due Date = Status Date + Time Interval (calculated, read-only)
- Time Interval editable for most statuses, locked when dropdown controls it
- 6 statuses lock Time Interval (Screening discussed, HgbA1c variants, BP call back variants)

### UC-8: Add Row
- Click "Add Row" → modal with: Member Name (required), DOB (required), Telephone, Address
- New row appears at top (rowOrder: 0), Request Type cell auto-focused
- Sort clears to show new row

### UC-9: Duplicate Row
- Select row → click "Duplicate Mbr"
- Copies: name, DOB, phone, address. Clears: all measure fields
- New row below source, Request Type auto-focused
- Use case: adding multiple measures for same patient

### UC-10: Delete Row
- Select row → click "Delete Row" → confirmation modal → delete
- Row removed, count updates, duplicate flags recalculated

### UC-11: Status Filters
- Multi-select chips (OR logic within filters)
- "All" default, "Duplicates" exclusive
- Chips show counts (always reflect full dataset, not affected by search)
- Filter + search = AND logic

### UC-12: Patient Name Search
- Type in search input → case-insensitive partial match on memberName
- Ctrl+F focuses, Escape clears
- Status bar: "Showing X of Y rows"
- Search + status filter = AND logic

### UC-13: Column Sorting
- Click header: ascending → descending → clear
- Single-column sort only
- Sort clears on add/duplicate row to show new row at top

### UC-14: Member Info Toggle
- Toggles visibility of DOB, Telephone, Address columns
- Default: hidden (privacy)
- DOB always masked as "###"

### UC-15: Duplicate Detection
- Same patient (name + DOB) + requestType + qualityMeasure = duplicate
- Orange left stripe indicator
- Creating duplicate via edit → 409 error, alert, fields reset

---

## Role-Based Access Summary

| Capability | PHYSICIAN | STAFF | ADMIN |
|-----------|-----------|-------|-------|
| Physician selector | Hidden | Required | Required |
| See unassigned patients | No | No | Yes |
| Add/edit/delete rows | Own only | Assigned physicians | All |
| Admin pages | No | No | Yes |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+F / Cmd+F | Focus search input |
| Escape | Clear search and blur |
| Tab | Exit cell edit, next cell |
| Shift+Tab | Exit cell edit, previous cell |
| Enter | Exit cell edit, cell below |

---

## Key UX Review Points

When reviewing this page, pay special attention to:

1. **Row color readability**: Can you read text on all color backgrounds (especially yellow, green)?
2. **Overdue vs status color**: Is the red override clear and not confusing?
3. **Duplicate indicator**: Is the orange stripe noticeable but not alarming?
4. **Dropdown cascading**: Does it feel intuitive when fields clear?
5. **Save feedback**: Is "Saving..." → "Saved" visible enough?
6. **Filter bar**: Are active/inactive chips clearly distinguishable?
7. **Empty/loading/error states**: Do they guide the user appropriately?
8. **Cell editability**: Is it clear which cells are editable vs read-only vs disabled?
9. **Date input forgiveness**: Multiple formats accepted - does the UX help or confuse?
10. **Information density**: 14 columns - is it overwhelming? Is horizontal scroll needed?
11. **Status Date prompts**: Are contextual prompts ("Date Completed") helpful or cluttered?
12. **N/A diagonal stripe**: Is it clear that disabled tracking fields aren't broken?
