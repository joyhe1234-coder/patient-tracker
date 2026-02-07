# UI/UX Reviewer Agent Memory

## Application Overview
- Patient Quality Measure Tracker - healthcare application
- React + TypeScript + Vite frontend, Express + Prisma backend
- AG Grid for main data table, Tailwind CSS for styling
- Runs on `http://localhost:5173` (dev) or `http://localhost:3000` (backend-served)

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin2@gmail.com` | `welcome100` |
| Primary Admin | `ko037291@gmail.com` | (check with user) |
| PHYSICIAN | `joyhe1234@gmail.com` | (reset via admin) |
| STAFF | `staff2@gmail.com` | (reset via admin) |

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

## Review History
| Date | Phase | Report | Key Findings |
|------|-------|--------|-------------|
| 2026-02-06 | Auth Flow | `reviews/auth-flow-2026-02-06.md` | 3 bugs fixed, 5 UX suggestions |
| 2026-02-06 | Patient Grid | `reviews/patient-grid-2026-02-06.md` | Column truncation, click-to-edit, accessibility gaps |
| 2026-02-06 | Import Flow (Deep) | `reviews/import-page-2026-02-06.md` | 14 screenshots, 8 findings, mobile table broken |
| 2026-02-06 | Admin Pages | `reviews/admin-pages-2026-02-06.md` | Audit log needs pagination + filtering |

## Recurring Issues
1. **Accessibility gaps**: Missing focus indicators, keyboard navigation issues, missing ARIA labels
2. **Native HTML validation**: Login + auth forms use browser-native validation instead of custom
3. **No pagination pattern**: Audit log renders all entries at once (needs pagination component)
4. **Column truncation**: AG Grid headers truncate at narrow widths — needs title tooltips
5. **Mobile responsiveness**: Preview changes table (7 columns) completely breaks on 375px mobile
6. **Mobile header**: App title wraps 4 lines on mobile, user menu pushed off-screen

## Known Bugs Fixed (Feb 6, 2026)
- BUG-1: Reset password generic error → reads specific backend error messages now
- BUG-2: STAFF with no assignments saw misleading message → separate "No Assignments" check
- BUG-3: Password toggle not keyboard accessible → removed tabIndex={-1}, added aria-label
