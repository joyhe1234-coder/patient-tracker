# Import Flow - Deep UI/UX Review Report

**Reviewed**: 2026-02-06 | **Viewport**: 1280x800 (desktop) + 375x812 (mobile) | **Role**: ADMIN
**Screenshots**: `import-review-01` through `import-review-14`

---

## Pages Reviewed

1. **Import Page** (`/import`) — 4-step wizard (System > Mode > Physician > File)
2. **Import Preview Page** (`/import/preview/:id`) — Diff summary, changes table, action buttons
3. **Reassignment Confirmation Modal** — Triggered when import reassigns patients
4. **Replace All Warning Modal** — Triggered in Replace mode

---

## Import Page (`/import`)

### Visual Design

**Layout & Spacing**: Clean vertical wizard layout with numbered steps (1-4). Each step has a numbered circle, bold heading, and helper text. White card sections on gray background with generous spacing.

**Typography**: Step numbers in circles, bold headings, gray helper text below dropdowns. "Merge (Recommended)" uses bold label + description pattern.

**Color System**:
- Blue primary for "Preview Import" button and "Browse Files" label
- Blue highlight border on selected Merge mode card
- Red text + red dashed border on Replace All mode when selected
- Gray disabled state for Preview Import when incomplete
- Pink/red error banners for validation errors

**What's Working Well**:
- 4-step wizard flow is intuitive and guides users naturally
- Step numbers (1-4) in colored circles provide clear reading order
- "Recommended" badge on Merge mode helps users make the right choice
- Replace All warning text is visible in the card itself (not just in a modal)
- File upload zone with drag-and-drop, dashed border is recognizable
- File selected state shows filename + size with X remove button
- System selector pre-filled with "Hill Healthcare"
- Physician dropdown shows all eligible physicians
- Cancel link provides easy escape back to Patient Grid
- "What happens next?" section sets expectations

### Findings (sorted by severity)

#### 1. Preview Import Button Enabled Without Physician Selection
**Severity**: UX-SUGGESTION | **Category**: UX / Validation

The "Preview Import" button is enabled when a file is selected even if no physician is chosen (Step 3 still shows "-- Select a physician --"). Clicking it shows an error banner "Please select a physician to import patients for". The button should be disabled until ALL required fields are completed.

**Current**: Button enabled → click → error banner
**Expected**: Button disabled until Steps 1-4 are all valid

**Screenshot**: `import-review-11-no-physician-error.png`

**Recommendation**:
- Disable Preview Import until `system`, `physician`, and `file` are all set
- This follows the same pattern used when no file is uploaded (button is correctly disabled)

---

#### 2. Replace Mode Warning Could Use Icon
**Severity**: NICE-TO-HAVE | **Category**: Visual

When "Replace All" is selected, the card gets a red border and warning text. The separate confirmation modal has a warning icon, but the inline card does not.

**Screenshot**: `import-review-02-replace-mode.png`

**Recommendation**:
- Add a warning triangle icon next to "Replace All" in the card
- Consistent with the modal which already uses a warning icon

---

#### 3. No File Size Limit Displayed
**Severity**: NICE-TO-HAVE | **Category**: UX

The file upload zone shows accepted formats (.csv, .xlsx, .xls) but doesn't display a maximum file size limit.

**Screenshot**: `import-review-03-file-selected.png`

**Recommendation**:
- Add "Maximum file size: X MB" below the accepted formats text

---

#### 4. Mobile Header Overflow
**Severity**: NICE-TO-HAVE | **Category**: Responsive

On 375px mobile viewport, the app title "Patient Quality Measure Tracker" wraps excessively across 4 lines. The user menu button is pushed off-screen to the right. Navigation links (Patient Grid, Import, Admin) are cramped.

**Screenshot**: `import-review-13-mobile-top.png`

**Recommendation**:
- Use a shorter title on mobile (e.g., "Patient Tracker")
- Or use a hamburger menu pattern for navigation on small screens
- This is a global header issue, not specific to import page

---

## Import Preview Page (`/import/preview/:id`)

### Visual Design

**Layout**: Clean top-to-bottom layout:
1. Header with page title + file metadata (right-aligned)
2. Summary cards (2-column grid: Insert/Update, Skip/Both, Delete/Warnings, Total)
3. Patient summary bar (New/Existing/Total counts)
4. Reassignment warning section (if applicable)
5. Changes table (7 columns)
6. Sticky action bar at bottom (Cancel + Apply)

**Summary Cards**: Color-coded with background fills:
- Insert: Green background, dark green text
- Update: Blue background
- Skip: No fill (gray text)
- Both: Yellow background
- Delete: Pink/red background, red text
- Warnings: Gray text
- Total: Purple dashed border (distinguishes from action cards)

**What's Working Well**:
- Summary cards are immediately scannable — the 2-column grid works
- "42 Total" card with purple border visually separates from action cards
- Patient summary bar (New: 4, Existing: 6, Total: 10) is clear and concise
- Reassignment warning with orange border and warning icon is prominent
- Per-patient reassignment details show "From → To" with color-coded badges
- "You will need to confirm the reassignment" red text sets expectations
- Changes table has 7 informative columns with colored badges
- Action badges (INSERT green, SKIP gray) are immediately scannable
- Type badges (AWV purple, Screening orange, Quality blue) match the main grid
- New Status column uses green background highlight for compliant values
- Filter buttons work: clicking Insert shows "Showing 17 of 42 changes"
- File metadata (File, Mode, Expires) in header corner is useful
- Bottom action bar shows record count + reassignment count
- "Apply 17 Changes" green button with record count is clear CTA

### Findings (sorted by severity)

#### 5. File Name Not Displayed in Preview Header
**Severity**: UX-SUGGESTION | **Category**: UX

The header metadata shows "File:" but the filename appears to be missing or truncated. It shows "File:" with no visible value, then "Mode: MERGE" and "Expires: 11:33:25 AM" on the right side of the header.

**Screenshot**: `import-review-04-preview-top.png` (top-right shows "Fi..." truncated)

**Recommendation**:
- Ensure the filename is displayed: "File: test-valid.csv"
- The filename helps users confirm they're previewing the correct file

---

#### 6. Preview Table Not Responsive on Mobile
**Severity**: IMPORTANT | **Category**: Responsive

On mobile (375px), the 7-column changes table is severely truncated. Only ACTION, PATIENT, TYPE, and part of QUALITY MEASURE are visible. Old Status, New Status, and Reason columns are completely hidden off-screen with no horizontal scroll indicator.

**Screenshot**: `import-review-14-preview-mobile.png`

**Recommendation**:
- Add `overflow-x: auto` to the table container with a visible horizontal scrollbar
- Or collapse to a card-based layout on mobile (each row becomes a stacked card)
- At minimum, ensure users can scroll horizontally to see all 7 columns

---

#### 7. Summary Cards Grid Could Show "Showing X of Y" Count in Cards Row
**Severity**: NICE-TO-HAVE | **Category**: UX

When a filter is active, the "Showing 17 of 42 changes" text appears in the patient summary bar (not near the filter buttons). This works but could be more prominent near the filter controls.

**Screenshot**: `import-review-06-insert-filter.png`

**Recommendation**:
- This is minor — current placement is acceptable

---

#### 8. No Loading State Visible During Preview Generation
**Severity**: NICE-TO-HAVE | **Category**: UX

After clicking "Preview Import", the page navigated immediately to the preview page with data. There was no visible loading spinner or progress indicator during the transition. For larger files, this could leave users wondering if anything is happening.

**Recommendation**:
- Add a loading spinner or progress bar during preview generation
- This may already exist for slower imports — not reproducible with small test file

---

## Reassignment Confirmation Modal

**Screenshots**: `import-review-08-reassignment-modal.png`

**What's Working Well**:
- Warning icon (orange circle with !) draws attention
- "Confirm Patient Reassignment" heading is clear
- "4 patients" is bold for emphasis
- Lists all 4 patients with "From → To" in a clean layout
- "Are you sure you want to proceed?" in orange for emphasis
- Cancel + "Yes, Reassign & Import" buttons with orange/red CTA
- Modal properly dims background

**No Issues Found** — the modal is well-designed and provides clear information for the destructive action.

---

## Replace All Warning Modal

**Screenshots**: `import-review-09-replace-warning-modal.png`

**What's Working Well**:
- Warning icon (red circle with !) is prominent
- "Delete All Existing Data?" heading is alarming (appropriate)
- "Replace All" is bold in the description
- "This action cannot be undone." in red for emphasis
- Cancel + "Yes, Delete All & Import" buttons with red CTA
- Red button color matches destructive nature

**No Issues Found** — the modal correctly conveys the severity of the action.

---

## Error Handling

### Invalid File Type
**Screenshot**: `import-review-10-invalid-file-error.png`

Error banner: "Error — Please upload a CSV or Excel file (.csv, .xlsx, .xls)"
- Pink/red background with "!" icon
- Clear, specific message listing valid formats
- File is rejected, upload zone remains empty
- Preview Import stays disabled

**Working correctly.**

### Missing Physician Selection
**Screenshot**: `import-review-11-no-physician-error.png`

Error banner: "Error — Please select a physician to import patients for"
- Same pink/red banner pattern
- Clear message

**Issue**: Button should be disabled instead (see Finding #1 above).

---

## Summary

### Overall Scores (1-10)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Design | **9/10** | Excellent wizard layout, well-designed summary cards, color-coded badges, clear modals |
| User Experience | **8/10** | Strong 4-step flow, good filtering, excellent reassignment warnings. Minor button validation gap. |
| Accessibility | **6/10** | Form labels present, radio buttons work. File upload zone keyboard accessibility unverified. Table lacks aria summary. |
| Mobile Responsiveness | **4/10** | Import page stacks OK, but preview table completely breaks on mobile. Header overflows. |

### Top 3 Quick Wins
1. Disable Preview Import button until physician is selected (Finding #1)
2. Add `overflow-x: auto` to preview table container (Finding #6)
3. Display filename in preview header metadata (Finding #5)

### Top 3 Strategic Improvements
1. Mobile-responsive preview table (card layout or horizontal scroll)
2. Mobile-responsive header (hamburger menu or shortened title)
3. Loading indicator for preview generation with larger files

### What's Working Exceptionally Well
- 4-step wizard is intuitive and guides users naturally
- Summary cards on preview page are immediately scannable
- Reassignment warning and confirmation flow is thorough
- Replace All warning modal conveys severity appropriately
- Action filter buttons on preview table work correctly
- Error handling for invalid files and missing fields provides clear messages
- Color-coded action badges (INSERT/SKIP/UPDATE) are scannable
- Changes table provides comprehensive before/after comparison

### Screenshots Index

| File | Description |
|------|-------------|
| `import-review-01-default-admin.png` | Import page default state (ADMIN) |
| `import-review-02-replace-mode.png` | Replace All mode selected (red border) |
| `import-review-03-file-selected.png` | File selected, ready to preview |
| `import-review-04-preview-top.png` | Preview page top: summary cards |
| `import-review-05-reassignment-warning.png` | Reassignment warning + table start |
| `import-review-06-insert-filter.png` | Insert filter active (17 of 42) |
| `import-review-07-apply-button.png` | Apply button + action bar |
| `import-review-08-reassignment-modal.png` | Reassignment confirmation modal |
| `import-review-09-replace-warning-modal.png` | Replace All warning modal |
| `import-review-10-invalid-file-error.png` | Invalid file type error |
| `import-review-11-no-physician-error.png` | Missing physician error |
| `import-review-12-mobile-view.png` | Import page mobile (375px) |
| `import-review-13-mobile-top.png` | Mobile header overflow |
| `import-review-14-preview-mobile.png` | Preview table mobile (broken) |
