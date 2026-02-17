# Universal Sheet Selector - UI/UX Review
**Date**: 2026-02-15
**Reviewer**: UI/UX Reviewer Agent
**Component**: ImportPage + SheetSelector (Step 4: Select Tab & Physician)
**Screenshots**: 11 taken (import-review-01 through import-review-11)

## Test Matrix
| Scenario | System | File Type | Role | Result |
|----------|--------|-----------|------|--------|
| Initial page state (no file) | Hill | - | ADMIN | PASS - Steps 1-3 shown, Step 4 hidden |
| CSV upload, single tab | Hill | CSV | ADMIN | PASS - Tab auto-selects, physician dropdown shown |
| Physician selected, button enables | Hill | CSV | ADMIN | PASS - Preview Import button enables |
| CSV upload with Sutter | Sutter | CSV | ADMIN | PASS - Same Step 4 behavior as Hill |
| XLSX upload with Sutter | Sutter | XLSX | ADMIN | PASS - Single valid tab, auto-selects |
| System switch with file | Hill->Sutter | XLSX | ADMIN | PASS - Sheets re-fetched on system change |
| File removed | Any | - | ADMIN | PASS - Step 4 disappears cleanly |
| PHYSICIAN role auto-assign | Hill | CSV | PHYSICIAN | PASS - Physician auto-assigned, shown as static text |
| PHYSICIAN role button state | Hill | CSV | PHYSICIAN | PASS - Preview Import immediately enabled |
| Mobile 375px | Hill | XLSX | ADMIN | PASS - Layout adapts, no overflow |
| Tablet 768px | Hill | XLSX | ADMIN | PASS - Layout clean |
| Desktop 1440px | Hill | CSV | ADMIN | PASS - Proper max-width, centered |
| Desktop 1920px | Hill | CSV | ADMIN | PASS - Proper max-width, centered |

## Visual Design Review

### What's Working Well
1. **Step numbering badges**: Consistent blue-100/blue-600 circle badges across all 4 steps. Visual hierarchy is clear.
2. **Card-based layout**: Each step is in its own white card with shadow, providing clear visual separation.
3. **Conditional appearance**: Step 4 only appears after file upload, preventing cognitive overload.
4. **Static text for auto-selections**: Single-tab files show "Importing from: Sheet1" as static text (gray-50 bg, gray-900 text) instead of a dropdown, reducing visual noise.
5. **PHYSICIAN role UX**: Auto-assigned physician shown as "Importing for: Physician One" -- clear, non-editable.
6. **File metadata display**: CSV icon vs Excel icon distinction, file size shown, clear X button to remove.
7. **Responsive layout**: Adapts well across all breakpoints (375px, 768px, 1440px, 1920px).

### Issues Found

#### 1. [NICE-TO-HAVE] Step badge contrast (pre-existing)
- **Severity**: Nice-to-have
- **Category**: Accessibility
- **Description**: Step number badges use `text-blue-600` (#2563EB) on `bg-blue-100` (#DBEAFE). Measured contrast ratio: approximately 4.24:1. This narrowly fails WCAG AA for normal text (4.5:1 required). The step numbers are decorative/supplementary so this is low severity.
- **Recommendation**: Change to `text-blue-700` (#1D4ED8) which yields approximately 6.5:1 contrast.
- **File**: `C:\Users\joyxh\projects\patient-tracker\frontend\src\pages\ImportPage.tsx`, lines 244, 275, 332, 398

#### 2. [NICE-TO-HAVE] "Please select a physician" amber text contrast
- **Severity**: Nice-to-have
- **Category**: Accessibility
- **Description**: The validation hint "Please select a physician to continue." uses `text-amber-600` (#D97706) on white background. Contrast ratio: approximately 3.44:1. This fails WCAG AA (4.5:1 for small text).
- **Recommendation**: Change to `text-amber-700` (#B45309) for approximately 4.78:1, or use `text-orange-700` (#C2410C) for approximately 5.23:1.
- **File**: `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\import\SheetSelector.tsx`, line 349

#### 3. [NICE-TO-HAVE] Disabled button contrast
- **Severity**: Nice-to-have
- **Category**: Accessibility
- **Description**: The disabled "Preview Import" button uses `bg-gray-300` (#D1D5DB) with `text-gray-500` (#6B7280). Contrast ratio: approximately 2.78:1. This fails WCAG AA. However, WCAG 2.1 exempts disabled controls from contrast requirements (SC 1.4.3 Note 1), so this is informational only.
- **Current State**: The disabled state is visually distinguishable from the enabled state (gray vs blue), which is the key requirement.

#### 4. [NICE-TO-HAVE] Static text visual distinction
- **Severity**: Nice-to-have
- **Category**: Visual Design
- **Description**: The "Importing from: Sheet1" static text and the dropdown "-- Select a physician --" have slightly different visual treatments. The static text has `bg-gray-50 rounded-lg text-gray-900 font-medium` while the dropdown has a border. This inconsistency is minor but noticeable.
- **Recommendation**: Consider adding a subtle left border or icon to the static text to further differentiate it from an empty/disabled input. For example, add a checkmark icon to indicate "auto-selected."

#### 5. [IMPORTANT] No `role="alert"` on SheetSelector error state
- **Severity**: Important
- **Category**: Accessibility
- **Description**: The SheetSelector error display (line 224) has `role="alert"`, which is correct. However, the "Please select a physician to continue." hint text (line 349) does not use `role="alert"` or `aria-live`. Since this text appears conditionally and provides important guidance, screen readers may not announce it.
- **Recommendation**: Add `aria-live="polite"` to the paragraph element.
- **File**: `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\import\SheetSelector.tsx`, line 346-349

#### 6. [IMPORTANT] Single-tab "Importing from:" text lacks `aria-label`
- **Severity**: Important
- **Category**: Accessibility
- **Description**: When the single-tab auto-selects and shows as static text, the `<label htmlFor="sheet-selector">` points to `id="sheet-selector"`, but the static text `<div>` does not have that ID. The label is orphaned for single-tab files because the `<select>` element is not rendered.
- **Recommendation**: Add `id="sheet-selector"` to the static text `<div>`, or wrap it in an element with `role="status"` and `aria-label="Selected import tab"`.
- **File**: `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\import\SheetSelector.tsx`, lines 251-255

#### 7. [NICE-TO-HAVE] Auto-match suggestion text
- **Severity**: Nice-to-have
- **Category**: UX
- **Description**: When a physician is auto-matched from the tab name, the text "Auto-matched from tab name. You can change this if needed." appears in blue-600. This is helpful. However, with the CSV test file (tab name "Sheet1"), no match occurs, so the suggestion feature could not be visually verified. This is a test data limitation.

#### 8. [NICE-TO-HAVE] Physician role text styling inconsistency
- **Severity**: Nice-to-have
- **Category**: Visual Design
- **Description**: For PHYSICIAN role, the auto-assigned physician display uses `text-gray-700` ("Importing for: Physician One"), while the auto-selected tab display uses `text-gray-900 font-medium` ("Importing from: Sheet1"). The physician text appears slightly lighter/thinner than the tab text.
- **Recommendation**: Make both consistent -- use `text-gray-900 font-medium` for both auto-assigned displays.
- **File**: `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\import\SheetSelector.tsx`, line 317

## User Experience Review

### What's Working Well
1. **Progressive disclosure**: Step 4 only appears after file upload. Users are not overwhelmed with all fields at once.
2. **Smart defaults**: Single-tab files auto-select. PHYSICIAN users auto-assign. This reduces clicks.
3. **Clear validation feedback**: "Please select a physician to continue." appears immediately below the dropdown.
4. **Disabled button guards**: Preview Import is disabled until both tab and physician are selected.
5. **State cleanup on file remove**: Removing the file clears all Step 4 state cleanly.
6. **State cleanup on system change**: Switching healthcare system re-fetches sheets and resets selections.
7. **Universal behavior**: Hill and Sutter now have identical Step 4 flow, eliminating the previous "nested card" and "duplicate error" bugs from the Sutter-specific SheetSelector.

### UX Improvements (Previously Fixed Bugs Verified)
- **No nested card-in-card**: The parent `ImportPage.tsx` wraps Step 4 in a card, and `SheetSelector.tsx` renders its content directly inside it without adding its own card wrapper. This is correct now.
- **No duplicate error banners**: The SheetSelector renders its own error state OR the parent shows an error, not both. The `onError` callback sets `_sheetError` (unused variable with underscore prefix) in the parent. The parent's own error display only shows for validation/submission errors, not sheet discovery errors.

### Remaining UX Considerations

#### 9. [NICE-TO-HAVE] Loading state UX
- **Description**: When the file is uploaded, there's a brief loading spinner "Discovering workbook tabs..." while the sheet discovery API is called. During this time, users cannot proceed. This is correct behavior but the spinner is small and easy to miss.
- **Recommendation**: Consider adding a subtle animation to the Step 4 card (e.g., pulse border) while loading to draw attention.

#### 10. [NICE-TO-HAVE] Cancel link navigation
- **Description**: The "Cancel" link at the bottom navigates to "/" (home/grid page). This is reasonable, but on the PatientManagementPage, the context is already within the app. Canceling an import should perhaps stay on the same page rather than navigating away.
- **Current behavior**: href="/" navigates to grid page.

## Accessibility Review

### What's Working Well
1. **Labels**: Both "Import Tab" and "Assign to Physician" have proper `<label htmlFor>` and `<select id>` pairings for the dropdown cases.
2. **Healthcare system dropdown**: Has `aria-label="Healthcare system"` (fixed from previous review).
3. **Error display**: Uses `role="alert"` for error states.
4. **Invalid sheets expander**: Has proper `aria-expanded` attribute, `onKeyDown` handler for Enter/Space, and `focus:ring-2 focus:ring-blue-500` focus indicator.
5. **Radio buttons**: Import mode uses native `<input type="radio">` with `name="mode"`, proper keyboard navigation.
6. **Tab navigation**: `<nav aria-label="Patient management tabs">` with tab buttons.
7. **Focus indicators**: All interactive elements (dropdowns, buttons, links) have visible focus rings via Tailwind's `focus:ring-2 focus:ring-blue-500`.
8. **Keyboard navigation verified**: Tab key moves through all interactive elements in logical order.

### Accessibility Issues
(See issues #1, #2, #5, #6 above)

## Scores

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Visual Design | 8.5/10 | Clean, consistent card layout. Minor contrast issues on badges/amber text. |
| User Experience | 9/10 | Progressive disclosure, smart defaults, clean state management. Universal flow removes previous Sutter-specific bugs. |
| Accessibility | 7.5/10 | Good label coverage, focus indicators, and error roles. Orphaned label for single-tab case and missing aria-live on hint text. |

## Summary

### Top 3 Quick Wins
1. **Fix amber-600 hint text contrast**: Change `text-amber-600` to `text-amber-700` on the "Please select a physician" message (1 line change, fixes AA contrast).
2. **Add aria-live="polite" to physician hint**: Add to the paragraph at SheetSelector line 349 (1 attribute, helps screen reader users).
3. **Fix orphaned label for single-tab**: Add `id="sheet-selector"` to the static text div or `role="status"` (1 attribute).

### Top 3 Strategic Improvements
1. **Consistent auto-assigned text styling**: Unify PHYSICIAN role physician text to match tab text styling (font-medium, text-gray-900).
2. **Step badge contrast**: Bump step number text to text-blue-700 across all 4 steps for WCAG AA compliance.
3. **Multi-tab Excel testing**: Create a test Excel file with multiple valid tabs to verify dropdown behavior, auto-match, and invalid sheets expander in the browser.

### What's Working Well
- The universal SheetSelector approach is a significant improvement over the previous system-specific logic.
- Progressive disclosure (Step 4 appearing only after file upload) reduces cognitive load.
- Role-based behavior (PHYSICIAN auto-assign vs ADMIN/STAFF dropdown) is well-implemented and visually clear.
- State management is clean -- file removal, system switching, and re-uploads all reset properly.
- No regressions from the Sutter import flow refactor.
