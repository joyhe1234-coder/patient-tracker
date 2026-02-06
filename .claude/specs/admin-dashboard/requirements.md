# Feature: Admin Dashboard

## Overview
Admin-only dashboard for user management, staff-physician assignments, password resets, and audit log viewing. Accessible at /admin route.

## User Stories
- As an admin, I want to manage user accounts so I can control system access
- As an admin, I want to assign staff to physicians so they can access patient data
- As an admin, I want to view audit logs to monitor system activity
- As an admin, I want to reset passwords for users who are locked out

## Acceptance Criteria

### User Management
- AC-1: User list shows all users with email, display name, role, status
- AC-2: Create user with email, display name, password, role
- AC-3: Edit user (display name, role, canHavePatients for ADMIN)
- AC-4: Deactivate user (isActive=false, cannot login, appears dimmed)
- AC-5: Reset user password

### Staff Assignments
- AC-6: Edit staff user shows physician assignment checkboxes
- AC-7: Add/remove physician assignments
- AC-8: Staff user sees updated physician list on next login

### Audit Log
- AC-9: View recent audit entries
- AC-10: Entries include timestamp, user (email), action, details
- AC-11: Actions: LOGIN, LOGOUT, PASSWORD_CHANGE, user CRUD

### Patient Assignment
- AC-12: "Assign Patients" button links to /admin/patient-assignment
- AC-13: Assignment page for bulk reassignment

## UI Workflow
Admin login → Admin dashboard → User list → Create/Edit/Deactivate users
Audit Log tab → view activity

## Business Rules
- Only ADMIN role can access
- Users identified by email (no username)
- Deactivated users cannot login but data preserved
- Audit log uses 6-month retention with cleanup script

## Edge Cases
- Deactivate the only admin
- Create user with duplicate email
- Reset password for deactivated user
- Staff with assignments edited to PHYSICIAN role

## Dependencies
- Authentication
- Role-Based Access Control
