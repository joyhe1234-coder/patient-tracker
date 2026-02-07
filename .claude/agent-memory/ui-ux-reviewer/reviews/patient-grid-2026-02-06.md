# Patient Grid Page - UI/UX Review Report

**Reviewed**: 2026-02-06 | **Viewport**: 1920x1080 | **Role**: ADMIN | **Data**: 100 rows, Dr. Smith

**Screenshots**: `review-01` through `review-08` captured during review session.

---

## Visual Design Review

**Layout & Spacing**: The grid is well-organized with a clear vertical hierarchy: Header > Toolbar > Filter Bar > Grid > Status Bar. Padding and spacing between sections is consistent. The pinned left columns (Request Type, Member Name) provide good anchoring.

**Typography**: Font sizes are readable. Column headers use a slightly bolder weight than cell content, creating good hierarchy. Text is consistently left-aligned.

**Color System**: The 7-color row coding (white, yellow, blue, green, purple, orange, gray) plus red overdue override is excellent. Colors are muted and pastel-toned, which prevents eye fatigue for long sessions. The filter chip borders cleverly match their corresponding row colors.

**What's Working Well**:
- Toolbar button color coding (blue Add, green Duplicate, red Delete) is intuitive
- Filter chips with counts are immediately scannable
- N/A diagonal stripe pattern clearly communicates "disabled"
- Orange duplicate left stripe is subtle but noticeable
- Save indicator positioning (top-right) doesn't compete with content
- "Connected" status gives confidence

---

## Findings (sorted by severity)

### 1. Column Header Truncation
**Severity**: IMPORTANT | **Category**: Visual / UX

Several column headers are truncated at default widths:
- "Request T..." (should be "Request Type")
- "Time Interva..." (should be "Time Interval (Days)")
- "Possible Actions Needed & No..." (should be "Possible Actions Needed & Notes")
- "Member ..." (DOB, when Member Info visible)

**Impact**: Users can't read full column names without hovering or resizing. New users won't understand what "Request T..." means.

**Recommendation**:
- Add `title` tooltips on all column headers so hovering reveals full text
- Consider abbreviating: "Actions & Notes" instead of "Possible Actions Needed & Notes", "Interval (Days)" instead of "Time Interval (Days)"
- Or auto-size headers to fit content on initial load

---

### 2. Click-to-Select Also Enters Edit Mode
**Severity**: IMPORTANT | **Category**: UX

Clicking a cell to select a row immediately opens the cell editor (text input appears). Users wanting to just select a row to use Duplicate/Delete will accidentally trigger edit mode.

**Impact**: Accidental edits, extra Escape presses needed. Frustrating with auto-save since an accidental change saves immediately.

**Recommendation**:
- Require **double-click** to enter edit mode (AG Grid `singleClickEdit: false`)
- Or add a non-editable row-select zone (e.g., a checkbox column on the far left)

---

### 3. Inconsistent Status Bar Text
**Severity**: NICE-TO-HAVE | **Category**: UX

- Unfiltered: "Rows: 100"
- Filtered: "Showing 49 of 100 rows"
- Search: "Showing 5 of 100 rows"

The unfiltered format ("Rows: 100") doesn't match the filtered format ("Showing X of Y rows").

**Recommendation**: Always use "Showing X rows" or "Showing X of X rows" for consistency.

---

### 4. Tracking Prompt Cells Have Distinct Dark Background
**Severity**: NICE-TO-HAVE | **Category**: Visual

Cells showing "Select test type", "Select time period", "Select screening t..." have an olive/dark background that contrasts with the row status color. While functional (indicates a required selection), the dark shade breaks the visual consistency of the row colors.

**Recommendation**: Use the same background as the row status color but with italic/gray placeholder text to indicate "needs selection" - similar to how Status Date prompts work.

---

### 5. Split Header Row Accessibility
**Severity**: IMPORTANT | **Category**: Accessibility

The AG Grid renders column headers in two separate `rowgroup` elements - the pinned columns (Request Type, Member Name) are in one group, and the scrollable columns in another. Screen readers may interpret these as separate tables or miss the relationship between a row's pinned cells and scrollable cells.

**Impact**: Screen reader users may not understand the grid structure.

**Recommendation**: This is an AG Grid architecture limitation. Ensure ARIA attributes properly link the pinned and scrollable sections. Consider adding `aria-describedby` or a screen-reader-only summary of the grid structure.

---

### 6. DOB "###" Masking Not Screen Reader Friendly
**Severity**: IMPORTANT | **Category**: Accessibility

When Member Info is visible, DOB shows "###" - a screen reader would literally read "hash hash hash" with no semantic meaning.

**Recommendation**: Add `aria-label="Date of birth hidden for privacy"` to DOB cells when masked.

---

### 7. No Focus Indicators Visible on Filter Chips
**Severity**: IMPORTANT | **Category**: Accessibility

Filter chips use `button` role with `pressed` state (good), but there are no visible focus outlines when tabbing through them. Keyboard-only users can't tell which chip is focused.

**Recommendation**: Add `:focus-visible` outline styles to filter chip buttons. Use a 2px solid outline in a high-contrast color.

---

### 8. Color-Only Status Communication
**Severity**: NICE-TO-HAVE | **Category**: Accessibility

Row status is communicated primarily through background color. Color-blind users (8% of males) may not distinguish yellow from green, or blue from purple.

**Impact**: Users with deuteranopia may confuse "Contacted" (yellow) and "Completed" (green) rows.

**Recommendation**:
- The filter bar already helps (shows counts per status)
- Consider adding a small status icon or text badge in the Measure Status column
- Or add a pattern/texture for each status category as a secondary indicator

---

### 9. Member Info Toggle State Unclear
**Severity**: NICE-TO-HAVE | **Category**: UX

The Member Info button toggles columns but the visual difference between active/inactive states is subtle.

**Recommendation**: When active (columns visible), use a filled/pressed button style with a different background color. Add an eye-open vs eye-closed icon swap.

---

### 10. Information Density with Member Info On
**Severity**: NICE-TO-HAVE | **Category**: UX

When Member Info is toggled on, 14+ columns are visible. At 1920px the "Possible Actions Needed & Notes" column gets pushed far right and may require horizontal scrolling.

**Recommendation**:
- Consider a horizontal scroll indicator or shadow at the right edge
- Or collapse Tracking #3 by default (it's described as "placeholder for future use")
- The current approach of hiding Member Info by default is the right call

---

## Role-Specific Testing (Feb 6, 2026)

### ADMIN Role (admin2@gmail.com)
- **Physician selector**: Visible in header with dropdown of all physicians + "Unassigned patients" option
- **"Dr. Smith" selected**: Shows 100 rows, full grid functionality
- **"Unassigned patients" selected**: Shows 8 rows, editing works correctly
- **Admin nav**: Visible in header (Admin link)
- **Toolbar**: Add Row, Duplicate, Delete, Member Info all accessible
- **Status**: Working as expected

### PHYSICIAN Role (joyhe1234@gmail.com / Dr. Smith)
- **Physician selector**: Correctly HIDDEN (physicians auto-filter to own patients)
- **Admin nav**: Correctly HIDDEN
- **Grid**: Auto-loads own 100 patients, full editing access
- **Header**: Shows "Dr. Smith (PHYSICIAN)" with user menu
- **Status**: Working as expected

### STAFF Role (staff2@gmail.com / Staff two)
- **Physician selector**: NOT VISIBLE (empty dropdown because no StaffAssignment records exist)
- **Admin nav**: Correctly HIDDEN
- **Grid**: Shows "Select a Physician" empty state with instructions
- **BUG FOUND**: Message says "select a physician from the dropdown in the header" but no dropdown exists when `assignments.length === 0`. See BUG-2 in TODO.md.
- **Status**: Bug - misleading message when STAFF has no physician assignments

### Role-Specific Findings

| Feature | ADMIN | PHYSICIAN | STAFF (no assignments) |
|---------|-------|-----------|----------------------|
| Physician selector | Visible | Hidden | **MISSING (bug)** |
| Admin nav | Visible | Hidden | Hidden |
| Grid editing | Yes | Yes | N/A (can't reach grid) |
| Unassigned patients | Yes (dropdown option) | N/A | N/A |

---

## Summary

### Overall Scores (1-10)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Design | **8/10** | Clean, professional, great color system. Header truncation knocks it down. |
| User Experience | **7/10** | Functional and intuitive for most workflows. Click-to-edit and inconsistent status bar reduce score. |
| Accessibility | **5/10** | Proper button roles and pressed states, but missing focus indicators, screen reader labels, and non-color status indicators. |

### Top 3 Quick Wins
1. Add `title` tooltips to all column headers (fixes truncation for free)
2. Add `aria-label` to masked DOB cells ("Date of birth hidden for privacy")
3. Add `:focus-visible` outlines to filter chip buttons

### Top 3 Strategic Improvements
1. Switch from single-click to double-click editing (prevents accidental edits)
2. Add secondary status indicators beyond color (icon or text badge) for accessibility
3. Audit full keyboard navigation path through the grid (Tab order, arrow keys, Enter to edit)

### What's Working Well
- 7-color status system with red overdue override is clear and scannable
- Filter bar with live counts is excellent for quick triage
- Auto-save with "Saving..."/"Saved" feedback builds confidence
- Pinned left columns keep context during horizontal scroll
- Search with Ctrl+F shortcut and clear button
- Duplicate orange stripe is noticeable without being alarming
- Add Row modal is simple and focused
- Physician selector and role-based access work cleanly
