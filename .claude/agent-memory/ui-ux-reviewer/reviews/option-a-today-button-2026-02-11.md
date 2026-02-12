# Option A: Hover Today Button - Visual Review Report

**Date**: 2026-02-11
**Reviewer**: ui-ux-reviewer agent
**Feature**: Status Date cell-prompt stripe pattern + hover-reveal "Today" button
**Login**: ko037291@gmail.com (ADMIN + PHYSICIAN)
**URL**: http://localhost:5173
**Screenshots**: `review-option-a-*.png` in project root

---

## Test Results Summary

| # | Test Case | Result | Notes |
|---|-----------|--------|-------|
| 1 | Cell-prompt stripe pattern | PASS | Diagonal stripes, transparent bg, row color shows through |
| 2 | Stripe on different row colors | PASS (limited) | Works on green, yellow, blue, purple, overdue, white. Only 1 prompt cell in dataset. |
| 3 | Today button on hover | PASS | Blue button appears on right side of cell on hover |
| 4 | No Today on filled cells | PASS | Button element absent from DOM for filled cells |
| 5 | Click Today to stamp | **FAIL - BUG** | Triggers "Invalid date format" alert. ISO datetime not parsed. |
| 6 | Double-click manual edit | PASS | Empty editor, typed date saves correctly |
| 7 | Escape cancels edit | PASS | Returns to striped prompt state |
| 8 | Visual alignment | ISSUE | Button stretches to full cell height (45px), truncates prompt text |

---

## Findings

### BUG-1: "Today" button click triggers date format error (CRITICAL)

- **Severity**: CRITICAL
- **Category**: UX / Functionality
- **Description**: Clicking the "Today" button triggers an `alert("Invalid date format...")` dialog instead of stamping the date. The button calls `node.setDataValue('statusDate', '2026-02-11T12:00:00.000Z')`, which goes through the column's `valueSetter`. The `valueSetter` calls `parseAndValidateDate()` on line 1036, which uses regex `^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$` for ISO format -- this regex expects the string to END after the day digits, but the ISO datetime has `T12:00:00.000Z` appended.
- **Root Cause**: `parseAndValidateDate()` in PatientGrid.tsx line 202 does not handle full ISO datetime strings with time components. The regex anchors at `$` after the date portion.
- **Fix Options**:
  1. In `StatusDateRenderer.tsx`, set `node.data.statusDate = todayISO` directly and call `node.setData(node.data)` to bypass the valueSetter, OR
  2. Add ISO datetime regex to `parseAndValidateDate`: `^(\d{4})[-/](\d{1,2})[-/](\d{1,2})T` pattern, OR
  3. In the `valueSetter`, detect if the value is already a full ISO string (contains 'T') and assign directly without parsing.
- **Impact**: The primary one-click feature is completely broken. Users cannot use the "Today" button at all.
- **Files**: `frontend/src/components/grid/StatusDateRenderer.tsx:44`, `frontend/src/components/grid/PatientGrid.tsx:200-208`

### ISSUE-2: Today button stretches to full cell height (45px)

- **Severity**: IMPORTANT
- **Category**: Visual Design
- **Description**: The "Today" button renders at the full cell height (45px tall, 46px wide) because the parent `.status-date-renderer` uses `display: flex; align-items: center; height: 100%` and the button has no explicit height constraint. The button fills the entire vertical space of the cell.
- **Current state**: Button is 45x46px, dropdown arrows on adjacent columns are 18x18px. The size mismatch is jarring.
- **Impact**: The oversized button consumes ~33% of the 140px cell width, truncating the prompt text from "Date Completed" to "Dat..." (only 4 characters visible).
- **Fix**: Add `align-self: center` and explicit height to `.status-date-today-btn`:
  ```css
  .status-date-today-btn {
    align-self: center;
    height: auto;  /* or explicit like 20px */
    line-height: 1;
  }
  ```

### ISSUE-3: Prompt text severely truncated when Today button visible

- **Severity**: IMPORTANT
- **Category**: UX
- **Description**: When hovered, the prompt text "Date Completed" truncates to "Dat..." because the Today button (46px wide) + margins consume too much of the 140px column. The pencil icon takes another ~15px. Only ~60px remains for text.
- **Impact**: Users cannot read the prompt text, defeating the purpose of contextual prompts.
- **Fix Options**:
  1. Make the Today button narrower (reduce padding, use "T" or calendar icon instead of word)
  2. Use a tooltip on the prompt text so truncated text is still accessible
  3. Increase Status Date column width from 140px to 170px

### ISSUE-4: Stripe pattern visible through editor during editing

- **Severity**: NICE-TO-HAVE
- **Category**: Visual Design
- **Description**: When double-clicking to edit, the cell retains `cell-prompt` class alongside `ag-cell-inline-editing`. The stripe background bleeds through the transparent editor input. The editor text also inherits gray italic from `cell-prompt` (`color: #6B7280 !important; font-style: italic`).
- **Current CSS**: `.date-cell-editor` has `background: transparent`, and the global override `.ag-cell-edit-wrapper input` doesn't target this custom input.
- **Fix**: Add CSS rule to override prompt styles during editing:
  ```css
  .ag-cell-inline-editing.cell-prompt {
    background-image: none !important;
    color: inherit !important;
    font-style: normal !important;
  }
  .ag-cell-inline-editing .date-cell-editor {
    background-color: #ffffff !important;
    color: #1f2937 !important;
    font-style: normal !important;
  }
  ```

### ISSUE-5: Prompt text contrast fails WCAG AA on 6 of 8 row colors

- **Severity**: IMPORTANT
- **Category**: Accessibility
- **Description**: The prompt text color `#6B7280` (gray-500) against colored row backgrounds fails WCAG AA 4.5:1 minimum for normal-size text on most row colors:

  | Row Color | Background | Contrast Ratio | WCAG AA (4.5:1) |
  |-----------|-----------|----------------|-----------------|
  | White | #FFFFFF | 4.83:1 | PASS |
  | Yellow | #FFF9E6 | 4.59:1 | PASS |
  | Blue | #CCE5FF | 3.73:1 | FAIL |
  | Green | #D4EDDA | 3.90:1 | FAIL |
  | Purple | #E5D9F2 | 3.58:1 | FAIL |
  | Orange | #FFE8CC | 4.07:1 | FAIL |
  | Gray | #E9EBF3 | 4.06:1 | FAIL |
  | Overdue | #FFCDD2 | 3.43:1 | FAIL |

- **Note**: This is a pre-existing issue affecting ALL cell-prompt and cell-disabled text, not specific to this feature. The same `#6B7280` is used for N/A cells, tracking prompts, etc.
- **Fix**: Darken prompt text to `#4B5563` (gray-600) which would pass AA on all backgrounds. Check: #4B5563 on #CCE5FF = ~5.3:1, on #FFCDD2 = ~4.9:1.

### ISSUE-6: Today button contrast fails WCAG AA

- **Severity**: IMPORTANT
- **Category**: Accessibility
- **Description**: White `#FFFFFF` text on `#2196F3` (Material Blue 500) background has a contrast ratio of only 3.12:1, failing WCAG AA minimum of 4.5:1. The hover state `#1976D2` passes at 4.60:1.
- **Fix**: Use darker blue for the button background. `#1565C0` (Blue 800) gives ~6.1:1 contrast with white text.
  ```css
  .status-date-today-btn {
    background-color: #1565C0;
  }
  .status-date-today-btn:hover {
    background-color: #0D47A1;
  }
  ```

### ISSUE-7: Today button not keyboard-accessible

- **Severity**: NICE-TO-HAVE
- **Category**: Accessibility
- **Description**: The "Today" button cannot be reached via keyboard. It lives inside the cell renderer (display mode), and AG Grid Tab navigation skips directly to the cell editor (DateCellEditor). A keyboard-only user must use the double-click editor path.
- **Mitigating factor**: The button has `title="Set to today's date"` and is a native `<button>` element. The alternative keyboard path (Tab to cell -> type date -> Enter) exists.
- **Possible fix**: In DateCellEditor, add a "Today" button or keyboard shortcut (e.g., Ctrl+T or just pressing "t" to auto-fill today's date).

---

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Design | 5/10 | Stripe pattern is well-designed, but Today button sizing/proportions are poor, prompt text truncation is severe, and stripes bleed into editor |
| User Experience | 3/10 | Primary feature (Today click) is broken (BUG-1). Manual edit path works. Good escape handling. |
| Accessibility | 4/10 | Multiple contrast failures (prompt text, button), keyboard gap, though button uses semantic HTML with title |

---

## Top 3 Quick Wins

1. **Fix BUG-1**: Add ISO datetime recognition to `parseAndValidateDate` or bypass valueSetter in StatusDateRenderer. (~5 min fix)
2. **Fix button height**: Add `align-self: center; height: auto; line-height: 1` to `.status-date-today-btn`. (~2 min CSS fix)
3. **Darken button blue**: Change `background-color` from `#2196F3` to `#1565C0`. (~1 min CSS fix)

## Top 3 Strategic Improvements

1. **Prompt text contrast overhaul**: Change `#6B7280` to `#4B5563` globally for all cell-prompt and cell-disabled text (affects multiple features)
2. **Editor overlay for prompt cells**: Add CSS rule to hide stripes and reset text color when `cell-prompt` cell enters edit mode
3. **Keyboard shortcut for today's date**: Add "t" key or Ctrl+T in DateCellEditor to stamp today's date without mouse

## What's Working Well

1. **Stripe pattern design**: The diagonal stripes with transparent background are visually distinctive without being overwhelming. They blend seamlessly with all row colors, maintaining the color coding system.
2. **Correct empty/filled separation**: The renderer cleanly handles the three states (filled date, empty with prompt, empty without prompt) with appropriate UI for each.
3. **Escape cancellation**: Double-click editing and Escape cancel work correctly, returning the cell to the prompt state without data loss.
4. **e.stopPropagation()**: The Today button click handler correctly prevents cell selection/editing side effects.
5. **Consistent stripe CSS**: Both `cell-prompt` and `cell-disabled` share the identical stripe pattern, creating visual consistency between "needs input" and "disabled" states.
