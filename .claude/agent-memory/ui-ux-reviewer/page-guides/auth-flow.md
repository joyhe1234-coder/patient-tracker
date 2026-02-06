# Authentication Flow Page Guide

> **Pages**: Login, Forgot Password, Reset Password, Change Password Modal, Logout
> **Auth**: JWT-based, 8h expiry, bcrypt password hashing
> **SMTP**: Optional - password reset via email only if configured

---

## Page Layout

### 1. Login Page (`/login`)
- **Component**: `LoginPage.tsx`
- Logo + "Patient Quality Measure Tracker" heading
- "Sign in to access the patient tracking system" subtitle
- Email input (placeholder: `you@example.com`)
- Password input with show/hide toggle (eye icon)
- "Sign in" button (blue, full-width)
- "Forgot your password?" link → `/forgot-password`
- "Contact your administrator if you need access" helper text

### 2. Forgot Password Page (`/forgot-password`)
- **Component**: `ForgotPasswordPage.tsx`
- Has 3 states: Loading, SMTP Not Configured, Request Form / Success
- Loading: spinner while checking SMTP status
- SMTP Not Configured: yellow warning, "Password Reset Unavailable", "Back to Login"
- Request Form: email input + "Send Reset Link" button + "Back to Login"
- Success: green box, "Check Your Email", shows entered email, "Back to Login"

### 3. Reset Password Page (`/reset-password?token=TOKEN`)
- **Component**: `ResetPasswordPage.tsx`
- Has 3 states: Invalid Link, Reset Form, Success
- Invalid Link (no token): red error box, "Request New Reset" + "Back to Login"
- Reset Form: New Password + Confirm Password inputs, "Reset Password" button
- Success: green box, "Password Reset", auto-redirect to `/login` after 3s

### 4. Change Password Modal (from Header user menu)
- **Location**: inline in `Header.tsx`
- Triggered by: User Menu → "Change Password"
- Modal with: Current Password, New Password, Confirm New Password
- Buttons: "Cancel" (gray) | "Save" (blue)
- Success: green checkmark + "Password changed successfully!", auto-close after 2s

### 5. User Menu (Header right side)
- User button: display name + role badge (e.g., "Admin 2 (ADMIN)")
- Dropdown: User email (gray), "Change Password" (Key icon), "Logout" (LogOut icon)

---

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Email (login) | Required, must contain `@` | "Email is required" / "Please enter a valid email address" |
| Password (login) | Required | "Password is required" |
| New Password | Required, >= 8 chars | "Password must be at least 8 characters" |
| Confirm Password | Must match New Password | "Passwords do not match" |
| Current Password | Required, must be correct | "Current password is incorrect" |
| New != Current | Backend check | "New password must be different from current password" |

---

## Use Cases to Review

### UC-1: Login - Happy Path
- Enter valid email + password → click Sign in → redirects to `/`
- Loading state: button shows "Signing in..." with spinner, inputs disabled
- Role-specific post-login: PHYSICIAN auto-filters, STAFF/ADMIN shows physician selector

### UC-2: Login - Error States
- Invalid credentials → red banner "Invalid email or password"
- Empty email → "Email is required"
- Empty password → "Password is required"
- Invalid email format → "Please enter a valid email address"
- Error auto-clears when user types

### UC-3: Login - Already Authenticated
- Navigate to `/login` when already logged in → auto-redirect to `/`

### UC-4: Password Show/Hide Toggle
- Click eye icon → password becomes visible (type=text)
- Click again → password hidden (type=password)

### UC-5: Forgot Password - SMTP Configured
- Click "Forgot your password?" → navigates to `/forgot-password`
- Loading spinner while checking SMTP status
- Enter email → click "Send Reset Link"
- Success: "Check Your Email" message with entered email
- **Always shows success** (prevents email enumeration)

### UC-6: Forgot Password - SMTP Not Configured
- Navigate to `/forgot-password`
- Yellow warning: "Password Reset Unavailable"
- "Please contact your administrator to reset your password"
- "Back to Login" link

### UC-7: Reset Password - Valid Token
- Click reset link from email → `/reset-password?token=abc123`
- Enter new password + confirm → click "Reset Password"
- Client validates: >= 8 chars, passwords match
- Success: "Password Reset" + auto-redirect to `/login` after 3s

### UC-8: Reset Password - Invalid/Expired Token
- No token in URL → "Invalid Link" error
- Used token → "Reset link has already been used"
- Expired token (> 1 hour) → "Reset link has expired"
- "Request New Reset" + "Back to Login" links

### UC-9: Change Password (Modal)
- Click user menu → "Change Password"
- Modal opens with 3 password fields
- Fill all fields → click "Save"
- Loading: "Saving..." button, inputs disabled
- Success: green checkmark, auto-close after 2s
- Wrong current password → "Current password is incorrect"
- Same as current → "New password must be different from current password"

### UC-10: Logout
- Click user menu → "Logout"
- API call releases edit lock
- Clears localStorage token
- Redirects to `/login`

### UC-11: Session Expiry
- Token expires after 8 hours
- Next API call returns 401
- ProtectedRoute redirects to `/login`

### UC-12: Protected Route Guard
- Unauthenticated user visits `/` → redirect to `/login`
- Non-ADMIN visits `/admin` → redirect to `/`
- Shows loading spinner while checking auth

---

## Role Display

| Roles | Display |
|-------|---------|
| PHYSICIAN | (PHYSICIAN) |
| STAFF | (STAFF) |
| ADMIN | (ADMIN) |
| ADMIN + PHYSICIAN | (ADMIN + PHYSICIAN) |

---

## Key UX Review Points

1. **Login error clarity**: Are error messages helpful without revealing account existence?
2. **Password toggle**: Is the eye icon discoverable? Does it clearly show current state?
3. **Loading states**: Are all buttons disabled and showing spinners during API calls?
4. **Error auto-clear**: Do errors disappear when user starts typing?
5. **Forgot password flow**: Is the SMTP-not-configured state clear and helpful?
6. **Reset password redirect**: Is the 3-second auto-redirect too fast/slow?
7. **Change password modal**: Is "Cancel" clearly different from "Save"?
8. **Success feedback**: Are green success messages visible enough?
9. **Form accessibility**: Do all inputs have proper labels? Can you Tab through the form?
10. **Mobile responsiveness**: Does the login card scale well on small screens?
11. **Password requirements**: Is the 8-character minimum communicated before submission?
12. **Link discoverability**: Is "Forgot your password?" easy to find?
