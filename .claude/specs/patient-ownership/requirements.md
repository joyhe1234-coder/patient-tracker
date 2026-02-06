# Feature: Patient Ownership

## Overview
Patients are owned by physicians (Patient.ownerId). Physicians see only their own patients. Staff/Admin must select a physician to view their patients. Admin can view unassigned patients and bulk-assign them to physicians. Import requires explicit physician selection.

## User Stories
- As a physician, I want to see only my patients so I focus on my workload
- As staff, I want to select a physician to view their patients for data entry
- As an admin, I want to assign unassigned patients to physicians
- As an admin, I want to import data for a specific physician

## Acceptance Criteria

### Data Isolation
- AC-1: PHYSICIAN sees only patients where ownerId = their user ID
- AC-2: PHYSICIAN cannot see other physicians' patients
- AC-3: PHYSICIAN cannot see unassigned patients (ownerId = null)
- AC-4: No physician selector shown for PHYSICIAN role

### Staff View
- AC-5: STAFF sees physician selector dropdown with assigned physicians only
- AC-6: STAFF must select a physician before seeing data (empty grid by default)
- AC-7: Grid shows selected physician's patients
- AC-8: STAFF with no assignments sees "No physicians assigned" message

### Admin View
- AC-9: ADMIN sees physician selector with all eligible physicians + "Unassigned"
- AC-10: ADMIN can select "Unassigned patients" to view patients without owner
- AC-11: Provider dropdown only visible on Patient Grid page (not Import/Admin)
- AC-12: API sends physicianId=unassigned for unassigned patient queries

### Bulk Assignment
- AC-13: Admin can select patients and assign to a physician
- AC-14: Bulk assignment updates patient counts
- AC-15: Patient assignment page at /admin/patient-assignment

### Import Ownership
- AC-16: Import requires physician selection for ADMIN/STAFF
- AC-17: PHYSICIAN import auto-assigns to self
- AC-18: Reassignment warning when importing patients belonging to another physician
- AC-19: Reassignment requires explicit confirmation

## UI Workflow
Physician: Login → auto-filtered to own patients
Staff: Login → select physician → see their patients
Admin: Login → select physician or "Unassigned" → manage patients

## Business Rules
- canHavePatients: boolean field on User model
- PHYSICIAN always canHavePatients=true
- ADMIN default false, can be enabled
- STAFF always false
- Fresh API call on each physician switch (no caching)

## Edge Cases
- Physician with zero patients
- Patient transferred between physicians
- Staff assigned to deactivated physician
- Import reassignment of large number of patients

## Dependencies
- Authentication
- Role-Based Access Control
