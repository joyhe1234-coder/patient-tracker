# Visual Review: REQ-SEC-06 Account Lockout + Temp Password + Force Password Change

**Date**: 2026-02-13
**Reviewer**: UI/UX Reviewer Agent
**Target URL**: http://localhost (Docker nginx proxy)
**Login**: admin@clinic.com / changeme123
**Viewport**: 1280x800 (desktop), 375x812 (mobile)

---

## Screens Reviewed

| # | Screen | Screenshot | Status |
|---|--------|-----------|--------|
| 1 | Login Page - Default | `review-sec06-01-login-default.png` | PASS |
| 2 | Login Page - Error (Invalid Credentials) | `review-sec06-02-login-error.png` | PASS |
| 3 | Login Page - Error (4th attempt, no warning) | `review-sec06-02b-login-error-4th-attempt.png` | BUG |
| 4 | Admin Page - Users Tab (w/ Send Temp Password button) | `review-sec06-03-admin-users-tab.png` | PASS |
| 5 | Admin Page - Action Buttons Closeup | `review-sec06-04-action-buttons-closeup.png` | PASS |
| 6 | Confirm Dialog (browser native) | Not captured (browser blocked screenshot during dialog) | PASS (functional) |
| 7 | Temp Password Sent Modal (SMTP configured) | `review-sec06-06-temp-password-email-sent.png` | PASS |
| 8 | Audit Log - LOGIN_FAILED entries | `review-sec06-07-audit-log-login-failed.png` | PASS |
| 9 | Admin Page - Mail Button Hover | `review-sec06-08-mail-button-hover.png` | PASS |
| 10 | Admin Page - Mobile 375px | `review-sec06-09-admin-mobile.png` | KNOWN ISSUE |
| 11 | Login Page - Mobile 375px | `review-sec06-10-login-mobile.png` | PASS |
| 12 | Force Password Change Modal | Not testable (no user with mustChangePassword=true) | CODE REVIEW ONLY |

---

## Visual Design Review

### Layout & Spacing

**Login Page**
- Centered card layout, max-w-md -- consistent with existing design
- Proper spacing between form fields (space-y-6)
- Error banner has appropriate padding (p-4) and sits above form fields
- loginWarning yellow box has proper border and padding (p-4, border-yellow-200)
- "Forgot your password?" and admin contact text properly centered below form

**Admin Page - Users Tab**
- Send Temp Password (Mail) icon button fits naturally in the action button row
- 4 buttons in Actions column: Edit (pencil), Reset (key), Temp Password (mail), Deactivate (trash)
- Consistent sizing: all icons use `w-4 h-4`, buttons use `p-2`
- Self-row protection: System Admin row correctly omits the Deactivate button
- All action buttons use `text-gray-400` default with hover color changes

**Temp Password Result Modal**
- Well-structured with appropriate heading hierarchy (h3)
- Yellow warning box for "SMTP not configured" state matches app conventions
- Copy button with green checkmark feedback on successful copy
- Full-width blue "Close" button matches modal pattern (blue-600, rounded-md)
- Code/monospace font for temp password display -- good for readability
- Modal width: max-w-md with mx-4 for mobile padding -- appropriate

**Force Password Change Modal (code review)**
- z-[9999] ensures it overlays everything including AG Grid
- No close/X button -- correct (user cannot dismiss)
- Yellow lock icon in rounded circle -- clear visual indicator
- Form uses consistent spacing (space-y-4)
- Single show/hide toggle applies to both password fields -- good UX shortcut
- placeholder "At least 8 characters" communicates validation rule upfront

### Color Consistency

- Error states: bg-red-50 + text-red-700 -- CONSISTENT with existing pattern
- Warning states: bg-yellow-50 + border-yellow-200 + text-yellow-800 -- CONSISTENT
- Login warning: bg-yellow-50 + border-yellow-200 -- CONSISTENT
- Force change: yellow-100 circle + yellow-600 icon -- CONSISTENT
- Temp password modal: blue-600 button -- CONSISTENT
- Audit log badges:
  - LOGIN: bg-purple-100/text-purple-800 -- good
  - LOGIN_FAILED: bg-orange-100/text-orange-800 -- good, visually distinct
  - ACCOUNT_LOCKED: bg-red-100/text-red-800 -- good, red = severe
  - SEND_TEMP_PASSWORD: bg-gray-100/text-gray-800 -- falls to default

### Typography

- All headings, labels, and body text follow existing patterns
- Temp password uses `font-mono text-lg tracking-wider` -- excellent for readability
- All form labels use `text-sm font-medium text-gray-700` -- CONSISTENT

---

## User Experience Review

### Information Architecture

1. **Send Temp Password button placement**: Correctly positioned next to Reset Password (key) in the Actions column. The mail icon is intuitive for "send password via email."

2. **Confirm dialog**: Uses native browser `confirm()` -- functional but inconsistent with the app's custom modal pattern (UserModal, ResetPasswordModal use custom overlays). The confirm text is clear: "This will generate a temporary password and require the user to change it on next login. Continue?"

3. **Temp Password Result Modal**: Clear two-state design:
   - SMTP configured: Simple success message, no password shown
   - No SMTP: Yellow warning + temp password display + copy button

4. **Force Password Change Modal**: Blocking overlay with clear messaging. The user understands why they must change their password and cannot navigate away.

### Interaction Patterns

- **Single-click action**: Mail button click triggers confirm dialog immediately -- good, no extra modal layer
- **Hover feedback**: Icons change from gray-400 to blue-600 on hover -- visible but subtle
- **Copy feedback**: Copy button shows green checkmark for 2 seconds -- clear

### Error Handling

- **API failure**: `setError('Failed to send temporary password')` shows in the admin error banner -- CORRECT
- **Login failures**: "Invalid email or password" -- generic, good for security
- **Account lockout**: "Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes or reset your password." -- clear, actionable

### Flow Issues

NONE detected in the happy path.

---

## Accessibility Review

### Keyboard Navigation

- All action buttons are keyboard-focusable (no tabIndex restrictions)
- Browser default focus outline (auto, 0.8px) -- MINIMAL but functional
- Tab order: Edit -> Reset Password -> Send Temp Password -> Deactivate -- CORRECT sequence
- ForcePasswordChange: first input has `autoFocus` -- good
- Password toggle: has `aria-label` -- CORRECT

### ARIA & Screen Reader

- Send Temp Password button: `title="Send temporary password"` -- provides tooltip AND accessible name
- Edit button: `title="Edit user"` -- CORRECT
- Reset password button: `title="Reset password"` -- CORRECT
- Deactivate button: `title="Deactivate user"` -- CORRECT
- ForcePasswordChange: `htmlFor` on labels matches input `id` -- CORRECT
- Error messages in ForcePasswordChange: AlertCircle icon is decorative (no alt) but paired with text

### Color Contrast

| Element | Background | Text | Ratio | WCAG |
|---------|-----------|------|-------|------|
| Error banner (red) | #FEF2F2 | #B91C1C | ~7.2:1 | AAA PASS |
| Warning banner (yellow) | #FEFCE8 | #854D0E | ~6.8:1 | AA PASS |
| LOGIN_FAILED badge | #FFEDD5 | #9A3412 | ~5.2:1 | AA PASS |
| ACCOUNT_LOCKED badge | #FEE2E2 | #991B1B | ~6.5:1 | AA PASS |
| SEND_TEMP_PASSWORD badge | #F3F4F6 | #1F2937 | ~13.5:1 | AAA PASS |
| Action button (default) | transparent | #9CA3AF | ~2.6:1 | FAIL |
| Action button (hover) | transparent | #2563EB | ~4.3:1 | BORDERLINE |

### Touch Targets

- Action buttons: `p-2` padding on 16px icons = ~32px touch target -- FAILS 44px minimum
- Login inputs: full-width, adequate height
- Sign in button: `py-2 px-4` -- adequate

---

## Findings

### CRITICAL (0)

None.

### IMPORTANT (4)

**F-1: Account lockout warning not displayed to user (BUG)**
- **Category**: UX
- **Description**: After 3+ failed login attempts with an existing account (admin@hillphysicians.com), the backend was supposed to return a `warning` field alongside the error. However, the `admin@hillphysicians.com` account does NOT exist in the database, so the failed attempt counter never incremented -- the backend returned the "user not found" error path (line 99) before reaching the counter logic. When using a non-existent account, the counter is never incremented.
- **Root Cause**: The `admin@hillphysicians.com` account provided in the review request doesn't exist. The lockout/warning logic only works for accounts that exist in the DB. This is CORRECT security behavior (you shouldn't reveal which accounts exist), but it means the warning path (yellow box with "Having trouble logging in?") could not be verified live.
- **Impact**: Cannot verify the login warning UX for real users in this test environment without using a real account.
- **Recommendation**: The lockout warning path should be tested with a known-existing account (e.g., `staff2@gmail.com`). A code review confirms the warning UI is properly wired: `LoginPage.tsx` line 86-96 renders the yellow warning box when `loginWarning` is truthy. However, there is a potential race condition: the `useEffect` on line 23-26 calls `clearError()` (which also clears `loginWarning`) whenever `email` or `password` changes. If the user types after seeing the error, the warning disappears too. This is the INTENDED behavior based on the code, but it means the warning will only be visible as long as the user doesn't modify the form fields.

**F-2: `confirm()` dialog inconsistent with app modal pattern**
- **Category**: UX
- **Description**: The Send Temp Password action uses `window.confirm()` (native browser dialog) instead of a custom modal. Other destructive actions like "Deactivate user" also use `confirm()`, so this is consistent within the admin page, but it differs from the custom modals used for Reset Password and Edit User.
- **Current State**: Native browser `confirm()` dialog with text "This will generate a temporary password..."
- **Recommendation**: For consistency, consider using a custom `ConfirmModal` component (one already exists at `frontend/src/components/modals/ConfirmModal.tsx`). This would allow:
  - Consistent styling with the rest of the app
  - Custom button labels ("Send" / "Cancel" instead of "OK" / "Cancel")
  - Better accessibility (focus trap, ESC handling)
  - Screenshot-able for documentation

**F-3: SEND_TEMP_PASSWORD audit badge uses default gray color**
- **Category**: Visual
- **Description**: The `SEND_TEMP_PASSWORD` action in the audit log falls through to the default gray badge (`bg-gray-100 text-gray-800`) because it's not included in the color mapping switch/ternary in AdminPage.tsx.
- **Current State**: Gray badge, same as any unrecognized action.
- **Recommendation**: Add a dedicated color for `SEND_TEMP_PASSWORD`:
  ```tsx
  : entry.action === 'SEND_TEMP_PASSWORD'
  ? 'bg-yellow-100 text-yellow-800'  // Yellow = admin action affecting credentials
  ```
  This makes security-sensitive actions visually distinguishable in the audit log.

**F-4: Action button touch targets fail 44px minimum**
- **Category**: Accessibility
- **Description**: Action buttons (Edit, Reset, Temp Password, Deactivate) have `p-2` padding on 16px icons, yielding ~32x32px touch targets. WCAG 2.5.5 Target Size recommends 44x44px minimum.
- **Impact**: Difficult to tap on mobile/touch devices
- **Recommendation**: Add responsive padding:
  ```tsx
  className="p-2 md:p-2 p-3 text-gray-400 hover:text-blue-600"
  ```
  Or use min-w/min-h:
  ```tsx
  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-blue-600"
  ```

### NICE-TO-HAVE (4)

**F-5: Default action button color fails WCAG contrast**
- **Category**: Accessibility
- **Description**: Action buttons default to `text-gray-400` (#9CA3AF) on white background. This gives a contrast ratio of ~2.6:1, well below the 4.5:1 AA minimum.
- **Recommendation**: Use `text-gray-500` (#6B7280, ratio ~4.6:1) as the default, which passes AA.

**F-6: ForcePasswordChange not testable in current environment**
- **Category**: Testing
- **Description**: The ForcePasswordChange modal requires `mustChangePassword=true` in the auth store, which is set during login when the backend returns this flag. Since sending a temp password triggers email delivery (SMTP configured), we can't easily test this flow in the browser.
- **Recommendation**: Add a dev-only endpoint or admin tool to set `mustChangePassword` flag for a user without changing their password, enabling visual QA testing. Or, provide a way to test the no-SMTP path.

**F-7: No visual indicator in user table for "must change password" status**
- **Category**: UX
- **Description**: After sending a temp password, the user table still shows the user as "Active" with no indication that they'll be forced to change their password on next login.
- **Recommendation**: Add a visual indicator, such as a small badge or icon next to the status:
  ```
  Active (Must Change Password)
  ```
  or a warning icon tooltip.

**F-8: Mobile admin table truncates all columns beyond Role**
- **Category**: UX
- **Description**: At 375px width, the admin Users table shows only User and Role columns. Status, Last Login, Patients, and Actions are all hidden off-screen. This is a pre-existing issue (not introduced by this feature).
- **Impact**: Admin cannot manage users on mobile -- cannot edit, reset password, or send temp password.
- **Recommendation**: Already documented in MEMORY.md as a known issue.

---

## Summary

### Overall Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Design | 8/10 | Clean, consistent with existing patterns. Minor color issues with SEND_TEMP_PASSWORD badge and action button defaults. |
| User Experience | 7/10 | Good happy path. Native confirm() inconsistent with custom modals. No visual feedback for "must change password" state in user table. |
| Accessibility | 6/10 | Proper ARIA labels and keyboard access. Touch targets too small. Default action button color fails contrast. |

### Top 3 Quick Wins

1. **Add color for SEND_TEMP_PASSWORD badge** in audit log (1 line of code)
2. **Change default action button color** from `text-gray-400` to `text-gray-500` (1 class change)
3. **Add min-width/min-height** to action buttons for touch targets (1 class change)

### Top 3 Strategic Improvements

1. **Replace `confirm()` with `ConfirmModal`** for consistent UX across all destructive actions
2. **Add "Must Change Password" indicator** in user table status column
3. **Mobile-responsive admin table** (card layout on small screens -- pre-existing issue)

### What's Working Well

1. **Mail icon placement**: Natural position next to Reset Password button, intuitive grouping
2. **Temp Password Result Modal**: Clean two-state design (SMTP vs no-SMTP) with proper messaging and copy functionality
3. **ForcePasswordChange component**: Well-designed blocking modal with proper z-index, no escape mechanism, clear messaging, autoFocus, and proper form validation
4. **Audit log integration**: LOGIN_FAILED and SEND_TEMP_PASSWORD entries properly formatted with orange/gray badges, showing Reason, Email, and IP for security events
5. **Security**: Generic "Invalid email or password" for non-existent accounts prevents user enumeration; lockout counter only tracks existing accounts
6. **Color contrast**: All new badge colors pass WCAG AA
7. **ARIA labels**: All new buttons have descriptive `title` attributes for screen readers
