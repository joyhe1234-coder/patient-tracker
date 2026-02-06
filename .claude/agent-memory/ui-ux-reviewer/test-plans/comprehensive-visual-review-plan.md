# Comprehensive MCP Playwright Visual Review Test Plan

**Created:** February 6, 2026
**Scope:** All pages × All roles (ADMIN, STAFF, PHYSICIAN) + edge states
**Goal:** Systematic visual/UX/accessibility review of every page and role combination

---

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| ADMIN | `ko037291@gmail.com` | (primary admin) | Full access |
| ADMIN + PHYSICIAN | `admin2@gmail.com` | `welcome100` | Dual role, sees own patients |
| STAFF | (check user list) | - | Must have physician assignments |
| PHYSICIAN | (check user list) | - | Sees only own patients |

> If STAFF or PHYSICIAN accounts don't exist, create them via Admin panel first.

---

## Section 1: Account Management (Auth Flow)

### 1.1 Login Page (`/login`)

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| AUTH-1.1 | Default login page state | - | Navigate to `/login` | Logo, title, subtitle, email/password fields, sign-in button, forgot password link, helper text all visible |
| AUTH-1.2 | Empty form submission | - | Click "Sign in" with empty fields | "Email is required" and "Password is required" errors shown |
| AUTH-1.3 | Invalid email format | - | Type "notanemail" in email, submit | "Please enter a valid email address" error |
| AUTH-1.4 | Invalid credentials | - | Enter wrong email/password, submit | Red banner: "Invalid email or password" |
| AUTH-1.5 | Password visibility toggle | - | Click eye icon next to password | Password toggles between hidden (dots) and visible (text) |
| AUTH-1.6 | Loading state during login | - | Submit valid credentials | Button shows "Signing in..." with spinner, inputs disabled |
| AUTH-1.7 | Successful ADMIN login | ADMIN | Login as admin | Redirect to `/`, physician selector visible, admin nav link visible |
| AUTH-1.8 | Successful STAFF login | STAFF | Login as staff | Redirect to `/`, physician selector shows assigned physicians only, no admin link |
| AUTH-1.9 | Successful PHYSICIAN login | PHYSICIAN | Login as physician | Redirect to `/`, NO physician selector, grid loads own patients, no admin link |
| AUTH-1.10 | Error clears on typing | - | Trigger error, then start typing | Error message disappears |
| AUTH-1.11 | Mobile responsive login | - | View at 375×812 | Form fits mobile, no horizontal scroll, touch targets ≥44px |
| AUTH-1.12 | Tablet responsive login | - | View at 768×1024 | Form centered, good spacing |
| AUTH-1.13 | Keyboard navigation | - | Tab through all elements | Focus order: email → password → eye toggle → sign in → forgot password. Focus indicators visible. |
| AUTH-1.14 | ARIA labels & accessibility | - | Check all form elements | Inputs labeled, button has accessible name, error messages associated |

### 1.2 Forgot Password Page (`/forgot-password`)

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| AUTH-2.1 | Navigate to forgot password | - | Click "Forgot your password?" on login | `/forgot-password` loads with email form |
| AUTH-2.2 | SMTP not configured state | - | (if SMTP off) Load page | Yellow warning: "Password Reset Unavailable", "Contact administrator" |
| AUTH-2.3 | Submit email (success) | - | Enter email, click "Send Reset Link" | Green success: "Check Your Email", shows email, mentions 1-hour expiry |
| AUTH-2.4 | Empty email submission | - | Click send with empty email | Email required error |
| AUTH-2.5 | Back to login link | - | Click "Back to Login" | Returns to `/login` |
| AUTH-2.6 | Mobile responsive | - | View at 375×812 | Form fits, good spacing |

### 1.3 Reset Password Page (`/reset-password`)

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| AUTH-3.1 | Invalid/missing token | - | Navigate to `/reset-password` (no token) | Red error: "This password reset link is invalid", links to forgot-password and login |
| AUTH-3.2 | Valid token — form display | - | Navigate with valid token | Two password fields, "Reset Password" button |
| AUTH-3.3 | Password too short | - | Enter < 8 char password | "Password must be at least 8 characters" |
| AUTH-3.4 | Passwords don't match | - | Enter mismatched passwords | "Passwords do not match" |
| AUTH-3.5 | Successful reset | - | Enter valid matching passwords | Green success, "Redirecting to login...", auto-redirect |
| AUTH-3.6 | Expired token | - | Use expired token | API error displayed clearly |

### 1.4 User Menu & Change Password

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| AUTH-4.1 | User menu display — ADMIN | ADMIN | Click user icon in header | Shows email, role badge "(ADMIN)", "Change Password", "Logout" |
| AUTH-4.2 | User menu display — STAFF | STAFF | Click user icon | Shows email, role badge "(STAFF)", "Change Password", "Logout" |
| AUTH-4.3 | User menu display — PHYSICIAN | PHYSICIAN | Click user icon | Shows email, role badge "(PHYSICIAN)", "Change Password", "Logout" |
| AUTH-4.4 | User menu — dual role | ADMIN+PHYSICIAN | Click user icon | Shows "(ADMIN + PHYSICIAN)" badge |
| AUTH-4.5 | Change password modal | Any | Click "Change Password" | Modal with Current Password, New Password, Confirm Password fields |
| AUTH-4.6 | Change password — validation | Any | Submit empty, short, mismatched | Appropriate errors for each case |
| AUTH-4.7 | Change password — wrong current | Any | Enter wrong current password | "Current password is incorrect" error |
| AUTH-4.8 | Change password — success | Any | Enter valid change | Green checkmark, "Password changed successfully!", auto-close |
| AUTH-4.9 | Logout flow | Any | Click "Logout" | Redirect to `/login`, session cleared |
| AUTH-4.10 | Menu closes on outside click | Any | Open menu, click elsewhere | Menu closes |

---

## Section 2: Patient Grid (Main Page)

### 2.1 Header & Physician Selector

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-1.1 | Header layout — ADMIN | ADMIN | Login, view header | Logo, title, physician selector dropdown, user menu. Admin nav link visible. |
| GRID-1.2 | Header layout — STAFF | STAFF | Login, view header | Logo, title, physician selector (assigned physicians only), user menu. NO admin link. |
| GRID-1.3 | Header layout — PHYSICIAN | PHYSICIAN | Login, view header | Logo, title, NO physician selector, user menu. NO admin link. |
| GRID-1.4 | ADMIN physician dropdown | ADMIN | Open physician selector | All physicians listed + "Unassigned patients" option at top/bottom |
| GRID-1.5 | STAFF physician dropdown | STAFF | Open physician selector | Only assigned physicians shown, no "Unassigned" option |
| GRID-1.6 | ADMIN selects physician | ADMIN | Select a physician | Grid loads that physician's patients |
| GRID-1.7 | ADMIN selects "Unassigned" | ADMIN | Select "Unassigned patients" | Grid loads patients with no physician, editing works |
| GRID-1.8 | STAFF selects physician | STAFF | Select an assigned physician | Grid loads that physician's patients |
| GRID-1.9 | PHYSICIAN auto-load | PHYSICIAN | Login | Grid loads own patients immediately (no selection needed) |
| GRID-1.10 | Navigation links | ADMIN | Check header nav | "Patient Grid" (active), "Import", "Admin" links visible |
| GRID-1.11 | Navigation links — non-admin | STAFF/PHYSICIAN | Check header nav | "Patient Grid" (active), "Import" visible. NO "Admin" link. |

### 2.2 Initial Load States

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-2.1 | No physician selected — ADMIN | ADMIN | Login, don't select physician | "Select a Physician" prompt message |
| GRID-2.2 | No physician selected — STAFF | STAFF | Login, don't select physician | "Select a Physician" prompt message |
| GRID-2.3 | PHYSICIAN auto-loads grid | PHYSICIAN | Login | Grid loads with own patients, no prompt |
| GRID-2.4 | Loading spinner | Any | Select physician (observe during load) | Spinner + "Loading patient data..." |
| GRID-2.5 | Empty patient list | Any | Select physician with 0 patients | "No patient data to display" |
| GRID-2.6 | STAFF no assignments | STAFF (no assignments) | Login | "No Physician Assignments" + "Contact administrator" |
| GRID-2.7 | Error state | Any | (simulate network error) | Error message + "Retry" button |

### 2.3 Toolbar

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-3.1 | Toolbar default state | Any | View toolbar after grid loads | "Add Row" enabled (blue), "Duplicate Mbr" disabled (green/gray), "Delete Row" disabled (red/gray), "Member Info" toggle |
| GRID-3.2 | Row selected state | Any | Click a row | "Duplicate Mbr" and "Delete Row" become enabled |
| GRID-3.3 | Add Row modal | Any | Click "Add Row" | Modal: Member Name (required), DOB (required), Telephone, Address fields |
| GRID-3.4 | Add Row — validation | Any | Submit with empty required fields | "Member Name is required", "DOB is required" |
| GRID-3.5 | Add Row — success | Any | Fill and submit | New row appears at top, Request Type cell focused |
| GRID-3.6 | Duplicate Row | Any | Select row → "Duplicate Mbr" | New row below with same name/DOB/phone/address, measure fields empty |
| GRID-3.7 | Delete Row — confirm dialog | Any | Select row → "Delete Row" | Confirmation: "Are you sure you want to delete this row?" |
| GRID-3.8 | Delete Row — cancel | Any | Click Cancel in delete dialog | Row NOT deleted, dialog closes |
| GRID-3.9 | Member Info toggle ON | Any | Click Member Info (eye) icon | DOB, Phone, Address columns appear |
| GRID-3.10 | Member Info toggle OFF | Any | Click again | DOB, Phone, Address columns hidden |
| GRID-3.11 | Save indicator — saving | Any | Edit a cell, blur | "Saving..." (yellow) briefly visible |
| GRID-3.12 | Save indicator — saved | Any | Wait for save | "Saved" (green checkmark) visible for 2s |
| GRID-3.13 | ADMIN toolbar on unassigned | ADMIN | Select "Unassigned patients" | Add/Edit/Delete should work for unassigned patients |

### 2.4 Status Filter Bar

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-4.1 | All filter chips visible | Any | View filter bar | All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A chips visible |
| GRID-4.2 | Default state — "All" active | Any | Initial load | "All" chip active (filled), others inactive (50% opacity) |
| GRID-4.3 | Chip counts | Any | View chip text | Each chip shows count: e.g., "Completed (5)" |
| GRID-4.4 | Single filter select | Any | Click "Completed" | Grid filters to completed rows only, "All" deselects, chip filled |
| GRID-4.5 | Multi-select filters | Any | Click "Completed" then "In Progress" | Both active, grid shows rows matching either status |
| GRID-4.6 | "All" deselects others | Any | Click "All" | All other chips deselect, show all rows |
| GRID-4.7 | "Duplicates" is exclusive | Any | Click "Duplicates" | Status filters deselect, only duplicate rows shown |
| GRID-4.8 | Active chip visual | Any | Select a filter | Filled background + border + checkmark icon |
| GRID-4.9 | Inactive chip visual | Any | Deselect filter | White background, lighter color, 50% opacity |
| GRID-4.10 | Search input visible | Any | View right side of filter bar | "Search by name..." input with magnifying glass |
| GRID-4.11 | Search filtering | Any | Type a name in search | Grid filters to matching names, status bar updates |
| GRID-4.12 | Search + filter combo | Any | Select "Completed" + type name | AND logic: only completed rows matching name |
| GRID-4.13 | Ctrl+F focuses search | Any | Press Ctrl+F | Search input gets focus |
| GRID-4.14 | Escape clears search | Any | Type text, press Escape | Text clears, input blurs |
| GRID-4.15 | X button clears search | Any | Type text, click X | Text clears |

### 2.5 AG Grid — Columns & Layout

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-5.1 | Default columns visible | Any | Load grid | Request Type, Member Name, Quality Measure, Measure Status, Status Date, Tracking 1/2/3, Due Date, Time Interval, Notes visible |
| GRID-5.2 | Pinned columns | Any | Scroll right | Request Type and Member Name stay pinned left |
| GRID-5.3 | Column header text | Any | Read headers | All 14 headers readable, properly aligned |
| GRID-5.4 | Cell padding & readability | Any | Read cell content | Text not clipped, adequate padding, readable font size |
| GRID-5.5 | Notes column flex | Any | Resize window | Notes column expands to fill remaining space |

### 2.6 AG Grid — Row Colors

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-6.1 | Green rows (Completed) | Any | Find completed status rows | Green background (#D4EDDA) |
| GRID-6.2 | Blue rows (In Progress) | Any | Find scheduled/ordered status | Blue background (#CCE5FF) |
| GRID-6.3 | Yellow rows (Contacted) | Any | Find contacted status | Yellow background (#FFF9E6) |
| GRID-6.4 | Purple rows (Declined) | Any | Find declined status | Purple background (#E5D9F2) |
| GRID-6.5 | Orange rows (Resolved) | Any | Find resolved status | Orange background (#FFE8CC) |
| GRID-6.6 | Red rows (Overdue) | Any | Find row with past due date | Red background (#FFCDD2), overrides blue/yellow/white |
| GRID-6.7 | Gray rows (N/A) | Any | Find N/A status | Gray background (#E9EBF3) |
| GRID-6.8 | White rows (default) | Any | Find not-addressed rows | White background |
| GRID-6.9 | Duplicate indicator | Any | Find duplicate row | Orange left border (4px), additive to status color |
| GRID-6.10 | Row selection highlight | Any | Click a row | Blue outline border, preserves status color |
| GRID-6.11 | Color contrast check | Any | All colored rows | Text readable against all background colors (4.5:1 ratio) |

### 2.7 AG Grid — Cell Editing

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-7.1 | Request Type dropdown | Any | Click Request Type cell | Dropdown: AWV, Chronic DX, Quality, Screening |
| GRID-7.2 | Quality Measure cascading | Any | Select "AWV" | Quality Measure auto-fills "Annual Wellness Visit" |
| GRID-7.3 | Cascading clear | Any | Change Request Type | Quality Measure, Measure Status, and downstream clear |
| GRID-7.4 | Status Date prompt | Any | Select a Measure Status, view Status Date | Shows contextual prompt (e.g., "Date Completed") |
| GRID-7.5 | Date input format | Any | Type date in Status Date | Accepts MM/DD/YYYY and variants |
| GRID-7.6 | Invalid date handling | Any | Type "abc" in date field | Alert with accepted formats, value reverts |
| GRID-7.7 | Tracking #1 — dropdown | Any | Select status with tracking options | Tracking #1 shows dropdown (e.g., Mammogram options) |
| GRID-7.8 | Tracking #1 — N/A | Any | Select status without tracking | Tracking #1 shows "N/A" with gray diagonal stripe |
| GRID-7.9 | Tracking #2 — conditional | Any | Select HgbA1c status | Tracking #2 shows months dropdown (1-12) |
| GRID-7.10 | Due Date calculated | Any | Set Status Date + Time Interval | Due Date auto-calculates, read-only |
| GRID-7.11 | Time Interval locked | Any | Select status with time period dropdown | Time Interval not editable |
| GRID-7.12 | Notes never cleared | Any | Change Request Type | Notes column retains its value |
| GRID-7.13 | Tab navigation in grid | Any | Press Tab while editing | Moves to next cell |
| GRID-7.14 | Esc cancels edit | Any | Edit cell, press Escape | Edit cancelled, value reverts |

### 2.8 AG Grid — Sorting

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-8.1 | Click to sort ascending | Any | Click column header | Sort indicator (up arrow), rows sorted ascending |
| GRID-8.2 | Click again descending | Any | Click same header again | Sort indicator (down arrow), rows sorted descending |
| GRID-8.3 | Third click clears sort | Any | Click same header third time | Sort indicator removed, original order |
| GRID-8.4 | Date sorting chronological | Any | Sort Status Date | Dates sort chronologically, not alphabetically |
| GRID-8.5 | Single sort indicator | Any | Sort column A, then column B | Only column B has sort indicator |

### 2.9 Status Bar

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| GRID-9.1 | Unfiltered count | Any | View status bar, no filters | "Showing X rows" |
| GRID-9.2 | Filtered count | Any | Apply filter | "Showing X of Y rows" |
| GRID-9.3 | Search + filter count | Any | Search + status filter | Count reflects both filters |

---

## Section 3: Import & Data Management

### 3.1 Import Page (`/import`)

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| IMP-1.1 | Import page layout — ADMIN | ADMIN | Navigate to `/import` | System selector, mode selector, physician selector, file upload zone |
| IMP-1.2 | Import page layout — STAFF | STAFF | Navigate to `/import` | System selector, mode selector, physician selector (assigned only), file upload |
| IMP-1.3 | Import page layout — PHYSICIAN | PHYSICIAN | Navigate to `/import` | System selector, mode selector, NO physician selector (imports for self), file upload |
| IMP-1.4 | Default system selection | Any | View system selector | "Hill Healthcare" selected |
| IMP-1.5 | Mode selector — default | Any | View mode | "Merge" selected with recommended badge |
| IMP-1.6 | Mode selector — Replace warning | Any | Select "Replace" | Red warning box about data deletion, checkbox required |
| IMP-1.7 | ADMIN physician dropdown | ADMIN | Open physician selector | All physicians listed |
| IMP-1.8 | STAFF physician dropdown | STAFF | Open physician selector | Only assigned physicians |
| IMP-1.9 | File upload zone | Any | View upload area | Drag-and-drop zone, accepted formats (.csv, .xlsx, .xls) |
| IMP-1.10 | File selected display | Any | Upload a CSV file | File name shown, remove button |
| IMP-1.11 | Invalid file type | Any | Upload a .txt file | Rejection message |
| IMP-1.12 | Preview button — disabled | Any | No file selected | "Preview" button disabled |
| IMP-1.13 | Preview button — enabled | Any | Select file + physician | "Preview" button enabled |
| IMP-1.14 | Cancel link | Any | Click "Cancel" | Returns to main page |
| IMP-1.15 | Mobile responsive | Any | View at 375×812 | Steps stack vertically, upload zone accessible |

### 3.2 Import Preview Page (`/import/preview/:id`)

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| IMP-2.1 | Preview page layout | Any | Upload file, click Preview | Summary cards, changes table, action buttons |
| IMP-2.2 | Summary cards | Any | View cards | INSERT, UPDATE, SKIP counts visible with correct numbers |
| IMP-2.3 | Changes table | Any | View table | Row-by-row changes with action column |
| IMP-2.4 | Filter by action | Any | Click INSERT card | Table filters to INSERT rows only |
| IMP-2.5 | Cancel returns to import | Any | Click Cancel | Returns to `/import` with form state |
| IMP-2.6 | Apply Changes button | Any | View button | Shows record count: "Apply X Changes" |
| IMP-2.7 | Validation errors display | Any | Upload file with errors | Error table: Row #, Field, Error Message, Member Name |
| IMP-2.8 | File info in header | Any | View header | File name and size shown |

### 3.3 Import Execution

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| IMP-3.1 | Loading state | Any | Click "Apply Changes" | Loading spinner, progress indication |
| IMP-3.2 | Success state | Any | Wait for completion | Success message with statistics |
| IMP-3.3 | Statistics display | Any | View success page | Inserted, updated, deleted, skipped counts |
| IMP-3.4 | Navigation after import | Any | View buttons | "Import More" and "Go to Patient Grid" buttons |

---

## Section 4: Admin Pages (ADMIN-only)

### 4.1 Admin Page Access Control

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| ADM-1.1 | ADMIN can access `/admin` | ADMIN | Navigate to `/admin` | Admin page loads with Users/Audit tabs |
| ADM-1.2 | STAFF blocked from `/admin` | STAFF | Navigate to `/admin` | Redirect to `/` or access denied |
| ADM-1.3 | PHYSICIAN blocked from `/admin` | PHYSICIAN | Navigate to `/admin` | Redirect to `/` or access denied |
| ADM-1.4 | Admin nav link — ADMIN | ADMIN | View header nav | "Admin" link visible |
| ADM-1.5 | Admin nav link — hidden | STAFF/PHYSICIAN | View header nav | NO "Admin" link |

### 4.2 Users Tab

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| ADM-2.1 | Users table layout | ADMIN | View Users tab | Email, Display Name, Roles, Status, Last Login, Patient Count, Actions columns |
| ADM-2.2 | Role badges | ADMIN | View roles column | Correct badges: PHYSICIAN (stethoscope), STAFF (user), ADMIN (shield) |
| ADM-2.3 | Status indicator | ADMIN | View status | Green "Active" or gray "Inactive" |
| ADM-2.4 | Add User button | ADMIN | View toolbar | "Add User" button (blue, Plus icon) |
| ADM-2.5 | Add User modal | ADMIN | Click "Add User" | Modal: Email, Display Name, Roles (multi-select), Password |
| ADM-2.6 | Edit User modal | ADMIN | Click edit icon on row | Modal: Email (read-only), Display Name, Roles, Active toggle |
| ADM-2.7 | Reset Password modal | ADMIN | Click key icon | Modal: Generate random or enter custom password |
| ADM-2.8 | Delete User confirmation | ADMIN | Click trash icon | Confirmation dialog about patient reassignment |
| ADM-2.9 | Expandable row — STAFF | ADMIN | Click STAFF user row | Expands to show assigned physicians |
| ADM-2.10 | Expandable row — PHYSICIAN | ADMIN | Click PHYSICIAN user row | Expands to show assigned staff |

### 4.3 Audit Log Tab

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| ADM-3.1 | Audit log layout | ADMIN | Click "Audit Log" tab | Timestamp, User, Action, Entity, Entity ID, Changes columns |
| ADM-3.2 | Log entries sorted | ADMIN | View log | Newest first |
| ADM-3.3 | Filtering controls | ADMIN | View filters | User, action type, date range, entity type filters |
| ADM-3.4 | Pagination | ADMIN | View bottom | Page navigation, 50 per page |
| ADM-3.5 | Change details | ADMIN | View change entry | Before/after values for field-level changes |

### 4.4 Patient Assignment

| ID | Test Scenario | Role | Steps | Expected Behavior |
|----|---------------|------|-------|-------------------|
| ADM-4.1 | Assignment page layout | ADMIN | Navigate to patient assignment | Source/target physician dropdowns, patient list, assign button |
| ADM-4.2 | Source physician selection | ADMIN | Select source physician | Patient list loads for that physician |
| ADM-4.3 | Unassigned patients filter | ADMIN | Filter to unassigned | Only unassigned patients shown |
| ADM-4.4 | Select patients | ADMIN | Check patient checkboxes | Checkboxes toggle, "Select All" works |
| ADM-4.5 | Assign button | ADMIN | Select patients + target physician | "Assign" button enabled, shows count |
| ADM-4.6 | Assignment success | ADMIN | Click Assign | Success message, patients move to target |

---

## Section 5: Cross-Cutting Concerns

### 5.1 Responsive Design

| ID | Test Scenario | Breakpoint | Expected Behavior |
|----|---------------|------------|-------------------|
| RESP-1.1 | Desktop layout | 1920×1080 | Full layout, all elements visible |
| RESP-1.2 | Desktop compact | 1440×900 | Layout adapts, no overflow |
| RESP-1.3 | Tablet | 768×1024 | Stacked layouts where needed, grid scrollable |
| RESP-1.4 | Mobile | 375×812 | Auth pages work, grid horizontally scrollable |

### 5.2 Accessibility

| ID | Test Scenario | Expected Behavior |
|----|---------------|-------------------|
| A11Y-1.1 | Color contrast — all pages | Text meets 4.5:1 contrast ratio (WCAG AA) |
| A11Y-1.2 | Focus indicators | All interactive elements have visible focus ring |
| A11Y-1.3 | Keyboard navigation — login | Tab through all login elements |
| A11Y-1.4 | Keyboard navigation — grid | Navigate grid with keyboard |
| A11Y-1.5 | Screen reader labels | All inputs have associated labels, buttons have names |
| A11Y-1.6 | ARIA roles on modals | Modals have role="dialog", aria-modal="true" |
| A11Y-1.7 | Error announcement | Form errors associated with inputs via aria-describedby |
| A11Y-1.8 | Touch targets | Mobile interactive elements ≥44×44px |

### 5.3 Visual Consistency

| ID | Test Scenario | Expected Behavior |
|----|---------------|-------------------|
| VIS-1.1 | Color palette consistency | Blue (#3B82F6) for primary, red for destructive, green for success |
| VIS-1.2 | Typography consistency | Same font family, consistent heading sizes |
| VIS-1.3 | Spacing consistency | Consistent padding/margins across pages |
| VIS-1.4 | Button styles consistency | Same border-radius, padding, hover states |
| VIS-1.5 | Icon consistency | Lucide icons throughout, consistent sizing |
| VIS-1.6 | Loading states consistency | Same spinner style across all loading states |
| VIS-1.7 | Error states consistency | Same red color, icon, layout for all errors |

---

## Execution Plan

### Phase 1: Account Management Review
1. Review login page (all states) — screenshots at desktop + mobile
2. Review forgot/reset password flow — all states
3. Review user menu & change password — each role
4. Log all findings

### Phase 2: Patient Grid Review — Per Role
1. ADMIN view — full grid with physician selector, unassigned patients
2. STAFF view — grid with assigned physicians, empty state
3. PHYSICIAN view — grid with auto-loaded patients
4. Cross-role: toolbar, filters, search, cell editing, row colors
5. Log all findings

### Phase 3: Import Flow Review
1. Import page — each role (ADMIN, STAFF, PHYSICIAN)
2. Import preview — summary cards, changes table
3. Import execution — loading, success, navigation
4. Log all findings

### Phase 4: Admin Pages Review
1. Users tab — table, modals (add/edit/reset/delete)
2. Audit log — table, filters, pagination
3. Patient assignment — workflow
4. Access control verification — STAFF/PHYSICIAN blocked
5. Log all findings

### Phase 5: Cross-Cutting Review
1. Responsive at all breakpoints
2. Accessibility audit
3. Visual consistency across all pages
4. Log all findings

---

## Tracking

| Phase | Status | Bugs Found | UX Suggestions | Date |
|-------|--------|------------|----------------|------|
| 1. Account Management | COMPLETE | 3 (all FIXED) | 5 | 2026-02-06 |
| 2. Patient Grid | COMPLETE | 0 | 10 | 2026-02-06 |
| 3. Import Flow (Deep) | COMPLETE | 0 | 8 (14 screenshots) | 2026-02-06 |
| 4. Admin Pages | COMPLETE | 0 | 8 | 2026-02-06 |
| 5. Cross-Cutting | PARTIAL | 0 | 0 | 2026-02-06 |

**Review Reports:**
- Phase 1: `.claude/agent-memory/ui-ux-reviewer/reviews/auth-flow-2026-02-06.md`
- Phase 2: `.claude/agent-memory/ui-ux-reviewer/reviews/patient-grid-2026-02-06.md`
- Phase 3: `.claude/agent-memory/ui-ux-reviewer/reviews/import-page-2026-02-06.md`
- Phase 4: `.claude/agent-memory/ui-ux-reviewer/reviews/admin-pages-2026-02-06.md`

**Screenshots taken:** 26 screenshots across all phases (`phase1-*`, `phase2a-*`, `phase2b-*`, `phase3-*`, `phase4-*`, `import-review-01` through `import-review-14`)

---

## Bug Log

### Confirmed Bugs (ALL FIXED)
| ID | Severity | Description | File | Root Cause | Fix | Found By | Status |
|----|----------|-------------|------|------------|-----|----------|--------|
| BUG-1 | Important | Reset password shows generic error instead of specific message | `ResetPasswordPage.tsx` | Not reading `data.error.message` from backend | Read `data.error.message` with `data.message` fallback | Phase 1 | FIXED |
| BUG-2 | Important | STAFF user sees "select from dropdown" but no dropdown when no assignments | `MainPage.tsx` | Missing `staffHasNoAssignments` check | Added separate check + "No Physician Assignments" message | Phase 2 | FIXED |
| BUG-3 | Important | Password visibility toggle not keyboard accessible | `LoginPage.tsx` | `tabIndex={-1}` on toggle button | Removed `tabIndex={-1}`, added `aria-label` | Phase 1 | FIXED |

### UX Suggestions (sorted by priority)
| ID | Phase | Priority | Description | Recommendation |
|----|-------|----------|-------------|----------------|
| UX-1 | Auth | Important | No password requirements shown before submission | Add "Must be at least 8 characters" helper text |
| UX-2 | Auth | Important | Native HTML5 validation instead of custom errors | Replace with JS validation + red banner pattern |
| UX-3 | Grid | Important | Column headers truncated at default width | Add `title` tooltips on all column headers |
| UX-4 | Grid | Important | Click-to-select enters edit mode | Switch to double-click edit (`singleClickEdit: false`) |
| UX-5 | Grid | Important | No focus indicators on filter chips | Add `:focus-visible` outline styles |
| UX-6 | Grid | Important | DOB "###" masking not screen reader friendly | Add `aria-label="Date of birth hidden for privacy"` |
| UX-7 | Grid | Important | Split header row accessibility | Add ARIA attributes linking pinned/scrollable sections |
| UX-8 | Admin | Important | Audit log has no pagination (100 entries on 1 page) | Add pagination (25-50 per page) |
| UX-9 | Admin | Important | Audit log has no filtering controls | Add action type, user, date range filters |
| UX-10 | Auth | Nice-to-have | Change Password modal missing visibility toggles | Add eye icon toggle to all 3 password fields |
| UX-11 | Auth | Nice-to-have | Change Password modal missing autocomplete attrs | Add `autocomplete="current-password"` / `"new-password"` |
| UX-12 | Auth | Nice-to-have | Reset password generic error doesn't distinguish token issues | Parse backend error for specific messages |
| UX-13 | Auth | Nice-to-have | No error auto-clear on typing (login page) | Clear error when user types in fields |
| UX-14 | Auth | Nice-to-have | Forgot password doesn't check SMTP availability | Call SMTP status API, show warning if unconfigured |
| UX-15 | Grid | Nice-to-have | Inconsistent status bar text format | Use "Showing X of Y rows" consistently |
| UX-16 | Grid | Nice-to-have | Tracking prompt cells have distinct dark background | Use row color + italic placeholder instead |
| UX-17 | Grid | Nice-to-have | Color-only status communication | Add secondary indicators (icon/text) for color-blind users |
| UX-18 | Grid | Nice-to-have | Member Info toggle state unclear | Use filled/pressed style with icon swap |
| UX-19 | Admin | Nice-to-have | Delete user uses native `confirm()` | Use custom ConfirmModal component |
| UX-20 | Admin | Nice-to-have | Audit log Details column shows "-" for most entries | Show IP/session for LOGIN, target for PASSWORD_RESET |
| UX-21 | Admin | Nice-to-have | Action badge colors not comprehensive | Add distinct colors for LOGOUT, PASSWORD_RESET |
| UX-22 | Admin | Nice-to-have | Entity column shows raw IDs | Show display name alongside ID |
| UX-23 | Import | Nice-to-have | Replace mode warning could be more prominent | Add warning triangle icon |
| UX-24 | Import | Nice-to-have | No file size limit displayed | Add "Maximum file size: X MB" text |
| UX-25 | Import | UX-Suggestion | Preview Import enabled without physician selection | Disable button until all required fields set |
| UX-26 | Import | UX-Suggestion | Filename not shown in preview header metadata | Display "File: test-valid.csv" in header |
| UX-27 | Import | Important | Preview changes table breaks on mobile (375px) | Add `overflow-x: auto` to table container |
| UX-28 | Import | Important | Mobile header overflows (title wraps 4 lines) | Use shorter title or hamburger menu on mobile |
| UX-29 | Import | Nice-to-have | No loading indicator during preview generation | Add spinner for larger file imports |
| UX-30 | Import | Nice-to-have | "Showing X of Y" text position not near filter buttons | Minor — current placement in patient summary bar acceptable |
