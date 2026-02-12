# UI/UX Reviewer Agent Memory

## Application Overview
- Patient Quality Measure Tracker - healthcare application
- React + TypeScript + Vite frontend, Express + Prisma backend
- AG Grid for main data table, Tailwind CSS for styling
- Runs on `http://localhost:5173` (dev) or `http://localhost:3000` (backend-served)

## Test Accounts
| Role | Email | Password | Notes |
|------|-------|----------|-------|
| ADMIN (bootstrap) | `admin@clinic.com` | `changeme123` | Auto-created default admin, works reliably |
| ADMIN | `admin2@gmail.com` | `welcome100` | May not exist if DB was reset |
| Primary Admin | `ko037291@gmail.com` | `welcome100` | ADMIN + PHYSICIAN dual role |
| PHYSICIAN | `joyhe1234@gmail.com` | (reset via admin) | |
| STAFF | `staff2@gmail.com` | (reset via admin) | |

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

## Known Bugs Fixed (Feb 6, 2026)
- BUG-1: Reset password generic error → reads specific backend error messages now
- BUG-2: STAFF with no assignments saw misleading message → separate "No Assignments" check
- BUG-3: Password toggle not keyboard accessible → removed tabIndex={-1}, added aria-label
