# UI/UX Reviewer Agent Memory

## Application Overview
- Patient Quality Measure Tracker - healthcare application
- React + TypeScript + Vite frontend, Express + Prisma backend
- AG Grid for main data table, Tailwind CSS for styling
- Runs on `http://localhost:5173` (dev), `http://localhost:3000` (backend-served), or `http://localhost` (Docker nginx)

## Test Accounts
| Role | Email | Password | Notes |
|------|-------|----------|-------|
| ADMIN (bootstrap) | `admin@clinic.com` | `changeme123` | Auto-created default admin, works reliably |
| ADMIN | `admin2@gmail.com` | `welcome100` | May not exist if DB was reset |
| Primary Admin | `ko037291@gmail.com` | `welcome100` | ADMIN + PHYSICIAN dual role |
| ADMIN | `admin@gmail.com` | `welcome100` | Used for RBAC testing |
| PHYSICIAN | `phy1@gmail.com` | `welcome100` | Physician One, 130 patients |
| PHYSICIAN | `joyhe1234@gmail.com` | (reset via admin) | |
| STAFF | `staff1@gmail.com` | `welcome100` | Assigned to Physician One + Ko Admin-Phy |
| STAFF | `staff2@gmail.com` | (reset via admin) | |
| DOES NOT EXIST | `admin@hillphysicians.com` | N/A | Not in DB -- do not use for lockout testing |

## Design System Tokens
- **Primary Blue**: #3B82F6 (buttons, links, active tabs)
- **Success Green**: bg-green-100/text-green-800 (badges, success states)
- **Error Red**: bg-red-50/text-red-700 (error banners), bg-red-100/text-red-800 (badges)
- **Warning Yellow**: bg-yellow-100/text-yellow-600 (warning states)
- **Role Colors**: Purple=ADMIN, Blue=PHYSICIAN, Green=STAFF
- **Grid Row Colors**: White(default), Yellow(contacted), Blue(in-progress), Green(completed), Purple(declined), Orange(resolved), Gray(N/A), Red(overdue override)
- **Font**: System fonts via Tailwind defaults

## Key UI Patterns
- **Auth pages**: Centered card layout, max-w-md, consistent error banner (red bg)
- **Modals**: Fixed overlay with bg-black/50, centered white card, Cancel/Save buttons
- **Tables**: White card with rounded-lg shadow, gray-50 headers, divide-y rows
- **Badges**: Inline-flex with icon + text, rounded, color-coded by type
- **Filter chips**: Button role with pressed state, border matches color, opacity 50% when inactive
- **Status bar**: Footer bar showing "Showing X of Y rows"
- **Pinned columns**: AG Grid pins Request Type + Member Name on left
- **Dropdown cells**: AutoOpenSelectEditor popup with hover-reveal blue arrow, checkmark on selected, (clear) in gray italic at top. Single-click opens. Keyboard: Arrow keys, Enter, Escape, type-ahead.
- **Date cells (Option A)**: StatusDateRenderer shows striped prompt + hover "Today" button for empty cells, plain date for filled. DateCellEditor is a simple inline text input (double-click to edit, no prepopulation). Today button calls setDataValue with ISO string. BUG: ISO datetime with time component not recognized by parseAndValidateDate.
- **Cell-prompt/cell-disabled stripes**: Same diagonal stripe pattern (repeating-linear-gradient -45deg, 4px transparent, 4px rgba(0,0,0,0.06)), transparent bg lets row color show through. Gray italic text #6B7280.

## Review History
| Date | Phase | Report | Key Findings |
|------|-------|--------|-------------|
| 2026-02-06 | Auth Flow | `reviews/auth-flow-2026-02-06.md` | 3 bugs fixed, 5 UX suggestions |
| 2026-02-06 | Patient Grid | `reviews/patient-grid-2026-02-06.md` | Column truncation, click-to-edit, accessibility gaps |
| 2026-02-06 | Import Flow (Deep) | `reviews/import-page-2026-02-06.md` | 14 screenshots, 8 findings, mobile table broken |
| 2026-02-06 | Admin Pages | `reviews/admin-pages-2026-02-06.md` | Audit log needs pagination + filtering |
| 2026-02-09 | Compact Filter Bar | `reviews/compact-filter-bar-2026-02-09.md` | All(220) count bug, opacity contrast failures, touch targets |
| 2026-02-11 | Auto-Open Dropdown | `reviews/auto-open-dropdown-2026-02-11.md` | 16 tests PASS, (clear) contrast fail, missing ARIA roles |
| 2026-02-11 | Date Prepopulate | `reviews/date-prepopulate-2026-02-11.md` | 7/7 tests PASS, missing aria-label, 5px alignment shift |
| 2026-02-11 | Option A Today Btn | `reviews/option-a-today-button-2026-02-11.md` | BUG: Today click broken (ISO parse), button 45px tall, 6/8 prompt contrast fails |
| 2026-02-12 | PatientGrid Refactor | `reviews/patientgrid-refactor-2026-02-12.md` | PASS - zero regressions. Extracted cascadingFields, useGridCellUpdate, useRemoteEditClass |
| 2026-02-12 | AdminPage Refactor | `reviews/admin-decomposition-refactor-2026-02-12.md` | PASS - zero regressions. Extracted UserModal, ResetPasswordModal |
| 2026-02-12 | CSS Quality Refactor | `reviews/css-quality-refactor-2026-02-12.md` | PASS - zero regressions. !important removed from 3 classes, inline styles replaced with CSS class |
| 2026-02-12 | Test Plan v2.1 B+A | `reviews/visual-test-plan-v2-rbac-cellrender-2026-02-12.md` | 37 tests: 35 PASS, 1 DEVIATION (auto-select physician), 1 SKIP (no prompt test data) |
| 2026-02-12 | Section C QM Matrix | `reviews/section-c-qm-status-matrix-2026-02-12.md` | 65 tests: 62 PASS, 2 DEVIATION (test plan errors), 1 SKIP. All row colors, due dates, TIs correct. |
| 2026-02-12 | Section C Part 2 | `reviews/section-c-qm-status-matrix-part2-2026-02-12.md` | 53 tests: 52 PASS, 1 DEVIATION. C.9-C.15: ACE/ARB, Vaccination, HgbA1c, Annual Serum, Chronic DX attestation, manual TI, cascading clears. Combined C.1-C.15: 134 tests, 131 PASS, 2 DEVIATION, 1 SKIP, 0 FAIL. |
| 2026-02-12 | Sections D-G | `reviews/sections-defg-search-sort-filter-overdue-2026-02-12.md` | 53 tests: 52 PASS, 0 DEVIATION, 1 SKIP (SORT-10 notes). Search, sorting, filter chips, overdue edge cases all verified. Combined B-G: 208 tests, 201 PASS, 4 DEVIATION, 3 SKIP, 0 FAIL. |
| 2026-02-12 | Sections H-K | `reviews/sections-hijk-toast-dup-kbd-hgba1c-2026-02-12.md` | 24 tests: 21 PASS, 10 DEVIATION, 3 SKIP, 0 FAIL. Toast=SaveStatusIndicator not toast, Dup detection correct, Keyboard 8/8, HgbA1c columns not in grid UI. **GRAND TOTAL B-K: 232 tests, 222 PASS, 14 DEVIATION, 6 SKIP, 0 FAIL.** |
| 2026-02-13 | REQ-SEC-06 Lockout+TempPass | `reviews/req-sec-06-lockout-temppass-forcechange-2026-02-13.md` | 12 screens, 4 IMPORTANT (lockout warning untestable, confirm() vs modal, badge color, touch targets), 4 NICE-TO-HAVE. ForcePasswordChange code-only review. |
| 2026-02-13 | Insurance Group Filter | `reviews/insurance-group-filter-2026-02-13.md` | 12 screenshots, 6 scenarios ALL PASS. Visual parity with QM dropdown. Touch target too small (pre-existing). Seed data limitation prevents visual filter verification. |
| 2026-02-14 | Sutter Import Flow | `reviews/sutter-import-flow-2026-02-14.md` | 12 screenshots. BUG: duplicate error banners, nested card-in-card. Missing aria-label on system select, no role=alert on errors. UnmappedActionsBanner good a11y. Step numbering correct. |
| 2026-02-15 | Universal SheetSelector | `reviews/universal-sheet-selector-2026-02-15.md` | 11 screenshots, 13 scenarios ALL PASS. Nested card + duplicate error bugs FIXED. Amber-600 hint fails AA contrast. Orphaned label for single-tab. PHYSICIAN auto-assign works correctly. |
| 2026-02-20 | Smart Column Mapping UI | (inline report) | Backend 404 blocks data display. Navigation gap (no link to /admin/import-mapping). Duplicate H1. Error banner missing role=alert. Code review of 6 components. |

## Recurring Issues
1. **Opacity-based dimming fails WCAG contrast**: Filter chips use opacity:0.5/0.3 for inactive/zero states. Perceived contrast drops to 1.6-2.7:1 (needs 4.5:1). Use explicit color tokens instead.
2. **Touch targets too small on mobile**: Filter chips 22px tall, search 30px, dropdown 23px. All fail 44px minimum. Add responsive padding on mobile.
3. **Accessibility gaps**: Missing focus indicators, keyboard navigation issues, missing ARIA labels
4. **Native HTML validation**: Login + auth forms use browser-native validation instead of custom
5. **No pagination pattern**: Audit log renders all entries at once (needs pagination component)
6. **Column truncation**: AG Grid headers truncate at narrow widths — needs title tooltips
7. **Mobile responsiveness**: Preview changes table (7 columns) completely breaks on 375px mobile
8. **Mobile header**: App title wraps 4 lines on mobile, user menu pushed off-screen

9. **Prompt text #6B7280 fails AA on colored rows**: Only passes on white (4.83) and yellow (4.59). Fails on blue (3.73), green (3.90), purple (3.58), orange (4.07), gray (4.06), overdue (3.43). Fix: use #4B5563.
10. **setDataValue + valueSetter mismatch**: When calling node.setDataValue() from a renderer, the value goes through the column's valueSetter. If the valueSetter expects display-format input (e.g., "2/11/2026") but receives ISO datetime ("2026-02-11T12:00:00.000Z"), parsing fails.
11. **Step number badges fail AA contrast**: blue-600 on blue-100 = 4.24:1 (needs 4.5:1). Fix: use text-blue-700.
12. **Import page form controls missing labels**: Healthcare System `<select>` has no aria-label, no htmlFor/id, no associated `<label>`. SheetSelector internal selects DO have proper labels.

## PatientGrid Component Structure (post-refactor Feb 12)
```
frontend/src/components/grid/
  PatientGrid.tsx             # Main component (uses hooks + utils)
  AutoOpenSelectEditor.tsx    # Dropdown cell editor
  DateCellEditor.tsx          # Date cell editor
  StatusDateRenderer.tsx      # Status date cell renderer
  hooks/
    useGridCellUpdate.ts      # onCellValueChanged handler (save, cascade, conflict)
    useRemoteEditClass.ts     # Remote edit CSS class for collaborative editing
  utils/
    cascadingFields.ts        # requestType -> QM -> status cascading clears
```

## AdminPage Component Structure (post-refactor Feb 12, updated Feb 13 w/ REQ-SEC-06)
```
frontend/src/pages/AdminPage.tsx           # Parent: tabs, users table, audit log (~605 lines)
frontend/src/components/modals/
  UserModal.tsx                            # Create/Edit user modal (304 lines)
  ResetPasswordModal.tsx                   # Reset password modal (128 lines)
frontend/src/components/
  ForcePasswordChange.tsx                  # Blocking password change overlay (125 lines)
frontend/src/components/auth/
  ProtectedRoute.tsx                       # Auth guard, renders ForcePasswordChange when mustChangePassword=true
```
- AdminPage: action buttons per row = Edit (pencil), Reset (key), Send Temp Password (mail), Deactivate (trash)
- Temp password flow: confirm() -> API -> modal (SMTP sent) or modal (temp password + copy button)
- Audit log badges: LOGIN=purple, LOGIN_FAILED=orange, ACCOUNT_LOCKED=red, SEND_TEMP_PASSWORD=gray (default)
- UserModal exports: AdminUser, Physician interfaces
- ResetPasswordModal has unused `userEmail` prop (dead code)
- AdminPage.tsx line 270: React key warning on `<>` fragment (pre-existing, not from refactor)

## CSS Architecture Notes (post-refactor Feb 12)
- **!important required**: Row status colors, selected row outline, cell focus, cell editing, stripe overlay, cell-disabled/cell-prompt text color, remote editing border, cell editor input colors -- all need `!important` to override AG Grid inline styles
- **!important NOT required**: Cell validation classes (`cell-invalid`, `cell-warning`, `cell-required-empty`) can use `.ag-theme-alpine .ag-cell.cell-xxx` specificity instead
- **Grid container**: `.patient-grid-container` class replaces inline `style={{ width: '100%', height: 'calc(100vh - 200px)' }}`
- **Tab visibility**: `.tab-visible`/`.tab-hidden` utility classes for tab panel toggling

## Save Feedback Patterns
- **Success**: SaveStatusIndicator in toolbar -- "Saving..." (yellow) -> "Saved" (green, 2s auto-dismiss) -> idle
- **Error**: showToast() DOM overlay (red, 4000ms, top-right, role="alert")
- **Warning**: showToast() DOM overlay (amber, 4000ms)
- **Conflict (409)**: Edit Conflict modal with 3-way merge: Original / Their Version / Your Version, buttons: Keep Theirs / Keep Mine / Cancel
- showToast is NOT called for success feedback -- only errors/warnings

## HgbA1c Field Architecture
- Database: `hgba1cGoal` (String?), `hgba1cGoalReachedYear` (Boolean), `hgba1cDeclined` (Boolean) in PatientMeasure model
- Grid: NO dedicated HgbA1c columns. Fields exist in DB but not exposed in UI
- Tracking #1: Free text "HgbA1c value" for HGBA1C_STATUSES (ordered/at goal/NOT at goal)
- Tracking #2: Dropdown 1-12 months testing interval for HGBA1C_STATUSES
- Time Interval: Auto-calculated from Tracking #2 month (locked, not manually editable)
- Non-HgbA1c rows: Tracking #1 and #2 show "N/A" with disabled striped styling

## Smart Column Mapping Component Structure (added Feb 20)
```
frontend/src/pages/MappingManagementPage.tsx         # Admin mapping management (729 lines)
frontend/src/components/import/
  MappingTable.tsx                                    # Reusable mapping table: view/edit/resolve modes (444 lines)
  ActionPatternTable.tsx                              # Sutter action regex patterns + skip actions (397 lines)
  ConflictResolutionStep.tsx                          # Admin inline conflict resolution (492 lines)
  ConflictBanner.tsx                                  # Non-admin read-only blocking banner (193 lines)
frontend/src/types/import-mapping.ts                  # TypeScript types for mapping system
```
- Route: `/admin/import-mapping` (ADMIN only, ProtectedRoute)
- `/hill-mapping` redirects to `/admin/import-mapping?system=hill`
- Conflict badges: blue=NEW, amber=CHANGED, red=MISSING/DUPLICATE/AMBIGUOUS
- MappingTable badge colors: purple=MEASURE, blue=PATIENT, green=DATA, gray=IGNORED, amber=Override
- ConflictResolutionStep has good a11y: role=alert on errors, aria-live on progress, progressbar with ARIA
- Backend `/api/import/mappings/:systemId` NOT YET IMPLEMENTED (404) -- blocks all data display

## Import Page Component Structure (updated Feb 15 w/ Universal SheetSelector)
```
frontend/src/pages/ImportPage.tsx              # Import form: system select, mode, file upload, Step 4 wrapper (~554 lines)
frontend/src/pages/ImportPreviewPage.tsx        # Preview & execute: summary cards, changes table, modals (~486 lines)
frontend/src/components/import/
  SheetSelector.tsx                             # Universal tab picker + physician auto-match (~357 lines)
  UnmappedActionsBanner.tsx                     # Skipped actions info banner with expand/collapse (108 lines)
  PreviewSummaryCards.tsx                        # Import preview summary cards
  PreviewChangesTable.tsx                        # Import preview changes table
  ImportResultsDisplay.tsx                       # Post-import results display
```
- Healthcare systems: `hill` (Hill Healthcare), `sutter` (Sutter/SIP)
- Universal flow (ALL systems): Steps 1-3 (System, Mode, Upload), then Step 4 (Select Tab & Physician) appears after file upload
- SheetSelector is universal: calls `/api/import/sheets` for ALL systems, auto-matches physician by tab name substring scoring
- Single-tab files: tab auto-selects, shown as static text "Importing from: [name]"
- Multi-tab files: dropdown appears to select tab
- PHYSICIAN role: physician auto-assigned (static text), Preview Import immediately enabled
- ADMIN/STAFF role: physician dropdown, "Please select a physician" hint until selected
- Previous BUGs FIXED: No nested card-in-card, no duplicate error banners
- Preview page shows Tab/Physician metadata conditionally for Sutter imports
- UnmappedActionsBanner uses role="status", aria-expanded, semantic table -- good a11y

## Known Bugs Fixed (Feb 6, 2026)
- BUG-1: Reset password generic error → reads specific backend error messages now
- BUG-2: STAFF with no assignments saw misleading message → separate "No Assignments" check
- BUG-3: Password toggle not keyboard accessible → removed tabIndex={-1}, added aria-label
