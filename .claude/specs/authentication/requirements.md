# Feature: Authentication

## Overview
JWT-based authentication with email/password login, session management, password change, forgot/reset password via email, and CLI password reset for administrators.

## User Stories
- As a user, I want to log in with my email and password to access the system
- As a user, I want to change my password for security
- As a user, I want to reset my forgotten password via email
- As an admin, I want CLI password reset for emergency access recovery

## Acceptance Criteria

### Login/Logout
- AC-1: Login page with email and password fields
- AC-2: Valid credentials redirect to main patient grid
- AC-3: Invalid credentials show "Invalid email or password" error
- AC-4: Form validation (required fields, email format)
- AC-5: Logout clears token from localStorage and redirects to login
- AC-6: User display name shown in header after login

### Session Management
- AC-7: JWT token stored in localStorage
- AC-8: Protected routes redirect to /login without valid token
- AC-9: Expired token (8 hours) redirects to /login
- AC-10: Auth state persists across page refreshes (Zustand persistence)

### Password Change
- AC-11: "Change Password" option in user menu
- AC-12: Requires current password, new password, confirm password
- AC-13: Wrong current password shows error
- AC-14: Success message on change, modal closes
- AC-15: Can login with new password after change

### Forgot Password (SMTP-dependent)
- AC-16: "Forgot Password?" link on login page
- AC-17: When SMTP configured: email form to request reset
- AC-18: When SMTP not configured: "Contact administrator" message
- AC-19: Same success message regardless of email existence (security)
- AC-20: Reset token expires after 1 hour
- AC-21: Reset token can only be used once

### Reset Password
- AC-22: Reset password page validates token
- AC-23: Invalid/expired token shows error with link to re-request
- AC-24: Password validation (minimum length, confirmation match)
- AC-25: Successful reset redirects to login

### CLI Tools
- AC-26: CLI password reset: `npm run reset-password -- --email user@clinic --password newpass`
- AC-27: Audit log cleanup: `npm run cleanup-audit-log -- --days 30`

## UI Workflow
Login: Navigate → enter email/password → Sign In → redirected to grid
Change: User menu → Change Password → fill form → Save
Forgot: Login page → Forgot Password → enter email → check email → click link → set new password

## Business Rules
- JWT 8-hour expiration
- Password hashed with bcrypt
- Reset tokens single-use, 1-hour expiry
- Same response for valid/invalid email on forgot password (prevents enumeration)
- Audit logging for LOGIN, LOGOUT, PASSWORD_CHANGE

## Edge Cases
- Token expires mid-session
- Multiple reset requests
- Reset link used after password manually changed
- SMTP configuration changes while system running

## Dependencies
- None (foundational feature)
