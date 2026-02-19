# Sutter/SIP Import Flow - UI/UX Review

**Date:** 2026-02-14
**Reviewer:** UI/UX Reviewer Agent (Claude Opus 4.6)
**Target:** Import page Sutter/SIP healthcare system selection, SheetSelector, UnmappedActionsBanner
**App URL:** http://localhost:5173/patient-management (Import Patients tab)
**Login:** ko037291@gmail.com (ADMIN + PHYSICIAN)

## Screenshots Captured

| # | File | Description |
|---|------|-------------|
| 01 | `sutter-review-01-logged-in.png` | After login - Patient Grid |
| 02 | `sutter-review-02-import-page-hill.png` | Import page with Hill Healthcare (default, 4 steps) |
| 03 | `sutter-review-03-dropdown-open.png` | Healthcare System dropdown open: Hill + Sutter/SIP |
| 04 | `sutter-review-04-sutter-selected.png` | Sutter/SIP selected (3 steps, no physician step) |
| 05 | `sutter-review-05-hill-regression.png` | Switched back to Hill (4 steps restored) |
| 06 | `sutter-review-06-tab-focus-1.png` | Keyboard focus on Merge radio |
| 07 | `sutter-review-07-tab-focus-2.png` | Keyboard focus on Cancel link |
| 08 | `sutter-review-08-file-uploaded-error.png` | File uploaded with Sutter: Step 4 + dual error banners |
| 09 | `sutter-review-09-mobile-375.png` | Mobile 375px full page |
| 10 | `sutter-review-10-tablet-768.png` | Tablet 768px full page |
| 11 | `sutter-review-11-desktop-1440.png` | Desktop 1440px full page |
| 12 | `sutter-review-12-file-removed.png` | File removed, back to clean 3-step Sutter flow |

---

## Functional Verification

### PASS: Sutter/SIP appears in Healthcare System dropdown
- Dropdown shows "Hill Healthcare" and "Sutter/SIP" options
- Sutter/SIP is properly selectable
- Dropdown uses same styling as all other dropdowns (consistent)

### PASS: Step numbering adjusts correctly
- **Hill Healthcare (ADMIN user):** Steps 1-4 (System, Mode, Physician, Upload)
- **Sutter/SIP (ADMIN user):** Steps 1-3 (System, Mode, Upload)
- Physician selection step (step 3) correctly hidden for Sutter since physician assignment happens in SheetSelector

### PASS: SheetSelector appears after file upload
- Step 4 "Select Tab & Physician" appears only when `isSutter && file` is true
- Correctly calls `/api/import/sheets` to discover workbook tabs
- Step 4 disappears when file is removed

### PASS: Hill Healthcare regression
- Switching back to Hill restores the original 4-step layout
- No SheetSelector appears
- No Sutter-specific state leaks into Hill flow

### PASS: File remove clears Sutter state
- Removing the file clears `selectedSheetName`, `sheetPhysicianId`, `sheetError`
- Step 4 disappears cleanly

### PASS: Preview Import button disabled states
- Disabled when: no file, or Sutter without sheet+physician selection
- Correctly uses gray-300/gray-500 disabled styling

---

## Findings

### F-01: Duplicate Error Banner Display (BUG)

**Severity:** RED Critical
**Category:** UX
**Description:** When sheet discovery fails, TWO error banners appear:
1. "Sheet Discovery Failed" -- rendered by SheetSelector component INSIDE step 4 card
2. "Sheet Discovery Error" -- rendered by ImportPage parent OUTSIDE step 4 card

The SheetSelector calls `onError(msg)` which sets `sheetError` in the parent, AND the SheetSelector itself renders its own error UI. This results in the same error message being displayed twice.

**Current State:** See screenshot `sutter-review-08-file-uploaded-error.png` -- both "Sheet Discovery Failed" and "Sheet Discovery Error" banners visible simultaneously with identical error text.

**Recommendation:** Either:
- (A) Remove the parent's `sheetError` rendering (lines 488-498 of ImportPage.tsx) and let SheetSelector handle its own error display, OR
- (B) Have SheetSelector NOT render its own error state when it has an `onError` callback, and let the parent handle all error display

Option (A) is simpler. The SheetSelector already renders a good-looking error card inside the step 4 container.

**Impact:** Users see two identical error messages, which is confusing and looks like a bug. In a healthcare application, clear error communication is critical.

---

### F-02: Nested Card-in-Card for SheetSelector (BUG)

**Severity:** YELLOW Important
**Category:** Visual
**Description:** The SheetSelector component wraps all three of its return paths (loading, error, normal) in their own container divs with shadow/background/padding. But the parent ImportPage.tsx (line 470) ALSO wraps SheetSelector in `<div className="bg-white rounded-lg shadow p-6 mb-6">`. This creates nested cards:

- **Loading state:** `bg-white shadow` inside `bg-white shadow` = double shadow, double padding (p-6 inside p-6 = 48px total)
- **Normal state:** `bg-white shadow space-y-5` inside `bg-white shadow` = same issue
- **Error state:** `bg-red-50` inside `bg-white shadow` = acceptable (different color stands out)

**Recommendation:** Remove the wrapper classes from SheetSelector's own containers. Since the parent already provides the card styling, SheetSelector should render bare content. Change:

```tsx
// SheetSelector.tsx loading state (line 170)
- <div className="bg-white rounded-lg shadow p-6 mb-6">
+ <div>

// SheetSelector.tsx normal state (line 210)
- <div className="bg-white rounded-lg shadow p-6 mb-6 space-y-5">
+ <div className="space-y-5">

// SheetSelector.tsx error state (line 197)
// This one can stay since it renders a colored error card inside the parent white card
```

**Impact:** Visual inconsistency -- double shadows and excessive padding when SheetSelector is in loading or normal state.

---

### F-03: Healthcare System Select Missing Accessible Label

**Severity:** YELLOW Important
**Category:** Accessibility
**Description:** The Healthcare System `<select>` element (ImportPage.tsx line 279) has no `id`, no `aria-label`, no `aria-labelledby`, and no associated `<label>` element. Screen readers cannot announce what this dropdown controls.

**Current State:** `<select value={systemId} ...>` with no label association. The heading "Select Healthcare System" is nearby but not programmatically linked.

**Recommendation:** Add `id` and `aria-label`, or associate with the heading:

```tsx
<select
  id="healthcare-system-select"
  aria-label="Healthcare system"
  value={systemId}
  onChange={...}
  className="..."
>
```

**Impact:** Screen reader users cannot identify the purpose of this dropdown. WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) violations.

---

### F-04: Error Banners Missing role="alert"

**Severity:** YELLOW Important
**Category:** Accessibility
**Description:** Both error banner containers (SheetSelector error and parent sheetError) lack `role="alert"` or `aria-live` attributes. When errors appear dynamically after a failed API call, screen reader users will not be notified.

**Current State:** Error banners use `<div className="bg-red-50 ...">` with no ARIA role.

**Recommendation:** Add `role="alert"` to error containers:

```tsx
// SheetSelector.tsx line 197
<div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">

// ImportPage.tsx line 489
<div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">

// ImportPage.tsx line 501 (general error)
<div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
```

**Impact:** Screen reader users miss critical error feedback. WCAG 4.1.3 (Status Messages) violation.

---

### F-05: Error Banner "!" Icon Not Hidden from Screen Readers

**Severity:** GREEN Nice-to-have
**Category:** Accessibility
**Description:** The `<span className="text-red-500 text-xl">!</span>` in error banners is read aloud by screen readers as "exclamation mark", which is redundant when paired with the error text.

**Recommendation:** Add `aria-hidden="true"`:

```tsx
<span className="text-red-500 text-xl" aria-hidden="true">!</span>
```

**Impact:** Minor screen reader verbosity. Not a WCAG violation but poor UX.

---

### F-06: Step Number Badge Contrast Borderline Failure

**Severity:** GREEN Nice-to-have
**Category:** Accessibility
**Description:** Step number badges use blue-600 (`rgb(37, 99, 235)`) text on blue-100 (`rgb(219, 234, 254)`) background. Calculated contrast ratio: **4.24:1**, which fails WCAG AA for normal text (requires 4.5:1). The text is 14px font-semibold.

**Recommendation:** Use blue-700 (`#1D4ED8`) instead of blue-600 for the step number text:

```tsx
<span className="... bg-blue-100 text-blue-700 font-semibold text-sm">
```

Blue-700 on blue-100 yields approximately 6.0:1, comfortably passing AA.

**Impact:** Low -- these are decorative step indicators and users rely on the heading text, not the number. However, fixing is trivial.

NOTE: This is a pre-existing issue affecting all step numbers, not specific to Sutter.

---

### F-07: Remove File Button Touch Target Too Small

**Severity:** GREEN Nice-to-have
**Category:** Accessibility
**Description:** The "Remove file" button (X icon) is 36x36px, below the WCAG 2.5.5 minimum of 44x44px for touch targets.

**Recommendation:** Increase padding:

```tsx
<button
  onClick={removeFile}
  className="p-3 text-gray-400 hover:text-red-500 transition-colors"
  title="Remove file"
  aria-label="Remove file"
>
```

Changing `p-2` to `p-3` makes it 44x44px.

**Impact:** Difficult to tap on mobile devices. Pre-existing issue, not specific to Sutter.

---

### F-08: UnmappedActionsBanner - Good Patterns (Positive)

**Severity:** N/A (Positive finding)
**Category:** Accessibility + UX
**Description:** The UnmappedActionsBanner component demonstrates good practices:
- Uses `role="status"` for screen reader announcements
- Has `aria-expanded` on the toggle button
- Uses semantic `<table>` with `<thead>`/`<tbody>` for data
- Expand/collapse toggle uses proper focus styles (`focus:outline-none focus:underline`)
- Blue info color (bg-blue-50, text-blue-800) provides clear but non-alarming visual feedback
- Shows count summary before details

No changes needed.

---

### F-09: SheetSelector Internal Dropdowns - Good Patterns (Positive)

**Severity:** N/A (Positive finding)
**Category:** Accessibility
**Description:** The SheetSelector's internal dropdowns have proper accessibility:
- `<label htmlFor="sheet-selector">` properly associated with `<select id="sheet-selector">`
- `<label htmlFor="physician-selector">` properly associated with `<select id="physician-selector">`
- Helpful hint text ("Auto-matched from tab name", "Please select a physician to continue")
- Good color coding for hints: blue-600 for info, amber-600 for warnings

Contrast these good practices with F-03 where the parent Healthcare System select is missing a label.

---

## Responsive Behavior

### Desktop (1440px) - PASS
All steps render cleanly with comfortable spacing. The max-w-2xl constraint keeps the form centered and readable. Error banners span the full card width.

### Tablet (768px) - PASS
Layout adjusts well. All step cards, dropdowns, and buttons remain properly sized. The file info card and error banners are readable.

### Mobile (375px) - PASS with Notes
- Step cards stack correctly
- File name truncates with ellipsis ("mock-patient-im...") -- good
- Error banners are readable but text is somewhat dense
- The dual error banners (F-01) take up significant vertical space on mobile
- Header wrapping is a known pre-existing issue (app title wraps 4 lines)

---

## Overall Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Design | 8/10 | Clean, consistent step layout. Nested card issue (F-02) and duplicate errors (F-01) bring it down. |
| User Experience | 7/10 | Good flow with conditional steps, but duplicate errors and raw 404 messages hurt. |
| Accessibility | 6/10 | SheetSelector internals are good, but parent form has missing labels (F-03), no alert roles (F-04). |

---

## Top 3 Quick Wins

1. **Fix F-01 (Duplicate errors):** Remove the parent `sheetError` banner rendering in ImportPage.tsx (lines 488-498). SheetSelector already displays its own error. ~5 min fix.
2. **Fix F-03 (Missing label):** Add `aria-label="Healthcare system"` to the `<select>` on line 279. ~1 min fix.
3. **Fix F-04 (Missing alert role):** Add `role="alert"` to error banner containers. ~2 min fix.

## Top 3 Strategic Improvements

1. **User-friendly error messages:** Replace raw "Request failed with status code 404" with contextual messages like "Could not discover workbook tabs. Please ensure you uploaded a valid Sutter/SIP Excel file." This requires backend route registration or a frontend error mapping layer.
2. **Remove SheetSelector's wrapper styling (F-02):** Let the parent provide card styling to avoid nested cards. Requires testing all three SheetSelector states (loading, error, normal) to verify visual parity.
3. **Accessibility audit of all Import page form controls:** The physician dropdown, mode radio buttons, and file input should all be audited for proper labeling. Currently, radio buttons have labels but they include the full description text.

## What's Working Well

- Step numbering dynamically adjusts when switching between Hill and Sutter -- smooth and correct
- Conditional rendering of SheetSelector (only after file upload) is well-implemented
- File display with emoji icon, name, size, and remove button is clean
- The UnmappedActionsBanner follows accessibility best practices (role, aria-expanded, semantic table)
- SheetSelector's internal dropdowns have proper htmlFor/id label associations
- Auto-match physician from tab name is a thoughtful UX feature that reduces user effort
- Preview page conditionally shows Tab/Physician metadata only for Sutter imports
- Import mode radio cards with blue/red highlighting are intuitive and visually clear
