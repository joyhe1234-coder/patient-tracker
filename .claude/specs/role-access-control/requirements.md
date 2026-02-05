# Feature: Role-Based Access Control

## Overview
Three roles (PHYSICIAN, STAFF, ADMIN) with different access levels. Controls page access, navigation visibility, API authorization, and data filtering.

## User Stories
- As a system, I want to restrict access based on user role to protect sensitive data
- As a physician, I want a simple interface focused on my patients
- As staff, I want to access only the physicians I'm assigned to
- As an admin, I want full access to manage the system

## Acceptance Criteria

### STAFF Restrictions
- AC-1: STAFF cannot access /admin page
- AC-2: No "Admin" link in navigation for STAFF
- AC-3: STAFF cannot see "Unassigned patients" option
- AC-4: STAFF only sees assigned physicians in dropdown
- AC-5: STAFF can access patient grid and import pages

### PHYSICIAN Restrictions
- AC-6: PHYSICIAN sees no physician selector dropdown
- AC-7: PHYSICIAN auto-filtered to own patients only
- AC-8: PHYSICIAN cannot access /admin or /admin/patient-assignment
- AC-9: No "Admin" link for PHYSICIAN
- AC-10: API ignores physicianId parameter for PHYSICIAN (forces own)
- AC-11: PHYSICIAN cannot view unassigned patients

### ADMIN Capabilities
- AC-12: ADMIN can access all pages (/admin, /, /import)
- AC-13: ADMIN can view any physician's patients
- AC-14: ADMIN can view unassigned patients
- AC-15: ADMIN has Admin link in navigation
- AC-16: ADMIN can access patient assignment page

### API Protection
- AC-17: 401 Unauthorized for requests without authentication token
- AC-18: 401 for /api/admin/* without authentication
- AC-19: 403 Forbidden for non-admin accessing admin endpoints
- AC-20: All protected routes redirect to /login when unauthenticated

## UI Workflow
STAFF: Login → patient grid + import only → physician dropdown with assigned only
PHYSICIAN: Login → auto-filtered patient grid → no dropdown → no admin
ADMIN: Login → all pages accessible → full physician dropdown → admin panel

## Business Rules
- Role checked on both frontend (navigation) and backend (API middleware)
- Frontend hides UI elements, backend enforces access
- PHYSICIAN physicianId forced server-side (cannot be spoofed)
- Users can have multiple roles (array-based) as of latest migration

## Edge Cases
- User with both ADMIN and PHYSICIAN roles
- STAFF with no physician assignments (empty state)
- Deactivated user attempting access
- Direct URL access to restricted page

## Dependencies
- Authentication (provides role information)
- Patient Ownership (data filtering based on role)
