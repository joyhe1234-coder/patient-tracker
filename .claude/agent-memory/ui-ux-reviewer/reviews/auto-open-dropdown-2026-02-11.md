# Auto-Open Dropdown Editor - Visual Browser Review

**Date**: 2026-02-11
**Reviewer**: UI/UX Reviewer Agent
**Component**: `AutoOpenSelectEditor.tsx`, `PatientGrid.tsx`, `index.css`
**Feature**: Single-click auto-open dropdown with hover-reveal arrow, checkmark, and (clear) option

---

## Test Summary

| Test | Result | Screenshot |
|------|--------|------------|
| Initial grid load | PASS | `dropdown-review-01-initial-grid.png` |
| Hover arrow on Request Type | PASS | `dropdown-review-03-hover-arrow-viewport.png` |
| Hover arrow on Quality Measure | PASS | `dropdown-review-04-hover-quality-measure.png` |
| Hover arrow on Measure Status | PASS | `dropdown-review-05-hover-measure-status.png` |
| No arrow on N/A cells | PASS | `dropdown-review-06-na-cell-no-arrow.png` |
| Single-click opens Request Type | PASS | `dropdown-review-07-request-type-open.png` |
| Single-click opens Quality Measure | PASS | `dropdown-review-08-quality-measure-open.png` |
| Single-click opens Measure Status | PASS | `dropdown-review-09-measure-status-open.png` |
| Keyboard ArrowDown | PASS | `dropdown-review-10-keyboard-arrow-down.png` |
| Keyboard ArrowUp | PASS | `dropdown-review-11-keyboard-arrow-up.png` |
| Keyboard Escape (cancel) | PASS | Value unchanged after Escape |
| N/A cell click - no dropdown | PASS | `dropdown-review-12-na-cell-clicked.png` |
| Cascading: AWV -> Quality Measure | PASS | `dropdown-review-13-awv-quality-filtered.png` |
| Cascading: Screening -> Quality Measure | PASS | `dropdown-review-14-screening-quality-filtered.png` |
| Tracking #1 dropdown (Attestation) | PASS | `dropdown-review-15-tracking1-dropdown.png` |
| Tracking #1 hover arrow (Cologuard) | PASS | `dropdown-review-16-tracking1-hover-arrow.png` |

---

## Visual Design Review

### Layout and Spacing
- **Dropdown popup**: Well-positioned below the cell, with min-width 160px. Options have 6px/12px padding (vertical/horizontal), which provides adequate click targets.
- **Box shadow**: `0 4px 12px rgba(0,0,0,0.15)` provides good depth separation from the grid.
- **Border radius**: 4px matches the clinical, professional aesthetic.
- **Font size**: 13px for options, which is slightly smaller than the grid's 14px. Acceptable but could be unified.

### Color and Contrast
- **Highlighted option**: `#e8f0fe` (light blue) background -- clear and visible.
- **Selected option (checkmark)**: `#f0f7ff` background with `font-weight: 600` -- distinguishable from highlight.
- **Checkmark color**: `#1a73e8` (Google blue) -- good visibility and on-brand for the app's blue accent.
- **Clear option**: `#9ca3af` gray italic -- clearly secondary, signals it's a destructive action.
- **Hover arrow**: `#2196F3` text with `rgba(33, 150, 243, 0.1)` background, 3px border-radius -- subtle and professional.

### Visual Hierarchy
- The checkmark character provides a clear "current selection" indicator.
- The "(clear)" option in italic gray is visually distinct from regular options.
- The hover-reveal arrow is subtle enough not to clutter the grid but visible enough to signal interactivity.

### Responsiveness
- Not tested at mobile breakpoints (AG Grid is typically desktop-only in healthcare apps).
- The dropdown popup does not appear to have overflow handling for very narrow viewports -- acceptable for target audience.

---

## User Experience Review

### Interaction Patterns -- PASS
1. **Single-click to open**: Works immediately on all three main dropdown columns (Request Type, Quality Measure, Measure Status) and conditional dropdowns (Tracking #1, Tracking #2).
2. **Hover-reveal arrow**: Blue down-triangle appears on hover, signaling that the cell is a dropdown. Disappears on mouse-out.
3. **Keyboard navigation**: ArrowUp/ArrowDown moves highlight, Enter/Tab selects, Escape cancels. Type-ahead (pressing a letter key) also supported.
4. **Cascading filtering**: Quality Measure options filtered by Request Type. Measure Status options filtered by Quality Measure. Both work correctly.
5. **Disabled cells**: N/A cells with diagonal stripes do not open dropdowns and do not show hover arrows.

### Information Architecture
- The "(clear)" option at the top of each dropdown is well-placed -- users can quickly reset a value.
- The checkmark next to the current value helps users orient themselves in the option list.
- Options are presented in a logical order (matching the configuration).

### Feedback
- Selecting an option immediately closes the dropdown and updates the cell.
- The "Saving..." indicator appears in the toolbar after selection (not tested in this review but verified in previous reviews).

---

## Accessibility Review

### ARIA and Semantic HTML
- **Dropdown popup uses `dialog` role** (`dialog "Cell Editor"`) -- this is acceptable but `listbox` would be more semantically appropriate for a dropdown selector. The AG Grid framework controls this via `isPopup()` returning true.
- **Options lack ARIA roles**: Each option is rendered as a `<div>` with no `role="option"` attribute. Screen readers would not announce these as selectable options.
- **No `aria-activedescendant`**: The highlighted option is tracked visually but not announced to screen readers via `aria-activedescendant`.
- **No `aria-selected`**: The selected option (with checkmark) has no `aria-selected="true"` attribute.

### Keyboard Navigation -- PASS
- All keyboard shortcuts work correctly (ArrowUp/Down, Enter, Escape, Tab, type-ahead).
- The `tabIndex={0}` on the list container ensures it receives focus on mount.

### Focus Management
- The dropdown list receives focus automatically via `useEffect` calling `listRef.current?.focus()`.
- Focus is properly contained within the dropdown while open.
- Escape returns focus to the grid cell.

### Color Contrast
- **(clear)** text: `#9ca3af` on `#fff` background = 2.6:1 contrast ratio. **FAILS WCAG AA** (needs 4.5:1 for normal text). The gray italic styling is too light.
- **Checkmark**: `#1a73e8` on `#f0f7ff` = approximately 4.8:1. **PASSES** WCAG AA.
- **Regular options**: Default text color (inherited, likely `#1f2937` dark gray) on `#fff` = approximately 15:1. **PASSES**.
- **Highlighted option text**: Dark text on `#e8f0fe` = approximately 14:1. **PASSES**.
- **Hover arrow**: `#2196F3` on `rgba(33,150,243,0.1)` = decorative indicator, contrast not critical for this non-text element.

### Touch Targets
- Option height at `padding: 6px 12px` with `font-size: 13px` gives approximately 25px total height. This is below the 44px WCAG recommendation for touch targets. However, this is a desktop-focused application and the target audience uses mouse/keyboard.

---

## Findings

### Finding 1: (clear) option fails WCAG color contrast
- **Severity**: Important
- **Category**: Accessibility
- **Description**: The "(clear)" option uses `color: #9ca3af` on white background, which produces a contrast ratio of approximately 2.6:1. WCAG AA requires 4.5:1 for normal text.
- **Recommendation**: Change the clear option color to `#6b7280` (Tailwind `gray-500`) which gives approximately 4.6:1 contrast ratio while still appearing visually lighter than regular options.
- **CSS fix**:
  ```css
  .auto-open-select-option.clear-option { color: #6b7280; }
  .auto-open-select-option .clear-label { color: #6b7280; }
  ```

### Finding 2: Tracking #1 and #2 dropdowns lack (clear) option
- **Severity**: Nice-to-have
- **Category**: UX
- **Description**: The three main dropdown columns (Request Type, Quality Measure, Measure Status) all include a "(clear)" option via an empty string in the values array. However, Tracking #1 and Tracking #2 dropdowns (e.g., Attestation sent/not sent, Cologuard, Mammogram, etc.) do not include a "(clear)" option.
- **Impact**: Users cannot reset a Tracking #1 or #2 value once set without cascading from a parent field.
- **Recommendation**: Add an empty-string prefix to the Tracking #1 and #2 value arrays in `cellEditorSelector` return values.

### Finding 3: Missing ARIA roles for screen reader support
- **Severity**: Important
- **Category**: Accessibility
- **Description**: The dropdown options are rendered as plain `<div>` elements without `role="option"` or `aria-selected` attributes. The container has no `role="listbox"`. Screen readers will not properly announce the dropdown as a list of selectable options.
- **Recommendation**: Add semantic ARIA attributes:
  ```tsx
  <div ref={listRef} tabIndex={0} role="listbox" aria-activedescendant={...}>
    {values.map((option, idx) => (
      <div role="option" aria-selected={option === value} ...>
  ```

### Finding 4: Font size inconsistency between grid and dropdown
- **Severity**: Nice-to-have
- **Category**: Visual Design
- **Description**: The AG Grid uses `--ag-font-size: 14px` but the dropdown editor uses `font-size: 13px`. This 1px difference is subtle but creates a slight mismatch.
- **Recommendation**: Change `.auto-open-select-editor { font-size: 14px; }` to match the grid, or use `font-size: inherit`.

---

## Scores

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Visual Design | 8/10 | Clean, professional. Minor font size inconsistency. |
| User Experience | 9/10 | Single-click open is excellent. Hover arrow is intuitive. Cascading works well. |
| Accessibility | 5/10 | Missing ARIA roles, (clear) contrast failure, no aria-activedescendant. |

---

## Top 3 Quick Wins

1. **Fix (clear) color contrast**: Change `#9ca3af` to `#6b7280` in CSS -- 1 line change, fixes WCAG violation.
2. **Add ARIA roles**: Add `role="listbox"` to container and `role="option"` + `aria-selected` to each option -- ~5 lines of code.
3. **Unify font size**: Change dropdown `font-size` from 13px to 14px to match grid.

## Top 3 Strategic Improvements

1. **Full ARIA compliance**: Add `aria-activedescendant`, `aria-label`, and proper `role` attributes for complete screen reader support.
2. **Add (clear) to Tracking dropdowns**: Ensure all dropdown-type cells have a way to clear the value.
3. **Add search/filter for long option lists**: Quality Measure dropdown can have 8+ options. A search filter would improve usability for large lists.

## What is Working Well

1. **Single-click open is a major UX improvement** over the previous behavior (which required a specific click pattern to open the native dropdown).
2. **Hover-reveal arrow** is a thoughtful design touch -- it signals interactivity without cluttering the grid.
3. **Checkmark on selected value** helps users quickly see what's currently chosen when the dropdown opens.
4. **Cascading behavior** works flawlessly -- Quality Measure correctly filters based on Request Type, and Measure Status filters based on Quality Measure.
5. **Keyboard navigation** is comprehensive -- ArrowUp/Down, Enter, Escape, Tab, and type-ahead all work correctly.
6. **Disabled cell protection** is solid -- N/A cells cannot be edited and do not show hover arrows.
