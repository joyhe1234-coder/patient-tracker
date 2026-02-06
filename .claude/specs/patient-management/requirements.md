# Requirements Document: Patient Management Page

## Introduction

Consolidate the existing **Import** page (`/import`) and **Patient Assignment** page (`/admin/patient-assignment`) into a single, unified **Patient Management** page. This new page provides a cohesive workflow for two related operations: importing new patient data from CSV/Excel files, and reassigning existing patients between physicians. Currently these are separate pages accessed from different navigation paths (Import from the main nav, Patient Assignment buried under Admin). Combining them under one "Patient Management" entry point improves discoverability and creates a logical workflow hub for all patient data management tasks.

## Alignment with Product Vision

This feature directly supports the product goals of:
- **Replacing Excel-based workflows**: A unified management page reduces context-switching between import and assignment tasks
- **Multi-physician support with patient isolation**: Centralized access to reassignment alongside import ensures patients are always properly assigned
- **Importing data from healthcare systems**: Import remains the core function, now co-located with assignment for a smoother post-import workflow
- **Administration**: ADMIN users get a single place for patient data operations instead of navigating between Import and Admin sub-pages

## Requirements

### Requirement 1: Unified Patient Management Page

**User Story:** As an ADMIN, I want a single "Patient Management" page that combines import and patient reassignment, so that I can manage all patient data operations from one place without navigating between separate pages.

#### Acceptance Criteria

1. WHEN user navigates to `/patient-management` THEN system SHALL display a tabbed interface with "Import Patients" and "Reassign Patients" tabs
2. WHEN the page loads THEN system SHALL default to the "Import Patients" tab
3. WHEN user clicks the "Reassign Patients" tab THEN system SHALL display the patient reassignment interface
4. WHEN user clicks the "Import Patients" tab THEN system SHALL display the existing import form interface
5. IF user is ADMIN THEN system SHALL display both tabs (Import Patients and Reassign Patients)
6. IF user is STAFF or PHYSICIAN THEN system SHALL display only the "Import Patients" tab (no Reassign Patients tab)
7. WHEN the page loads THEN the browser URL SHALL be `/patient-management`

### Requirement 2: Navigation Restructuring

**User Story:** As a user, I want to see "Patient Management" in the navigation bar instead of "Import", so that the nav label accurately reflects the broader functionality available.

#### Acceptance Criteria

1. WHEN user views the navigation bar THEN system SHALL display "Patient Mgmt" instead of "Import"
2. WHEN user clicks "Patient Mgmt" in navigation THEN system SHALL navigate to `/patient-management`
3. WHEN user navigates to `/import` (old URL) THEN system SHALL redirect to `/patient-management` (backwards compatibility)
4. WHEN user navigates to `/admin/patient-assignment` (old URL) THEN system SHALL redirect to `/patient-management?tab=reassign` (backwards compatibility)
5. WHEN ADMIN user is on the Admin page THEN system SHALL remove the "Patient Assignment" link (moved to Patient Management)

### Requirement 3: Import Patients Tab (Preserved Functionality)

**User Story:** As a STAFF/ADMIN/PHYSICIAN user, I want the import functionality to work exactly as before within the new tabbed layout, so that I don't lose any existing import capabilities.

#### Acceptance Criteria

1. WHEN user is on the "Import Patients" tab THEN system SHALL display the full import form: healthcare system selector, import mode (merge/replace), physician selector (for STAFF/ADMIN), file upload with drag-and-drop, and submit button
2. WHEN user submits an import THEN system SHALL navigate to `/patient-management/preview/:previewId` for the preview step
3. WHEN user completes or cancels the preview THEN system SHALL return to `/patient-management`
4. IF user is PHYSICIAN THEN system SHALL NOT show the physician selector step (auto-assigns to self)
5. IF user is STAFF or ADMIN THEN system SHALL show the physician selector step
6. WHEN user selects "Replace All" mode THEN system SHALL show the confirmation warning modal

### Requirement 4: Reassign Patients Tab (Preserved Functionality)

**User Story:** As an ADMIN, I want the patient reassignment functionality to work exactly as before within the new tabbed layout, so that I can still bulk-assign unassigned patients to physicians.

#### Acceptance Criteria

1. WHEN ADMIN user is on the "Reassign Patients" tab THEN system SHALL display the list of unassigned patients with checkboxes, physician selector, and "Assign Selected" button
2. WHEN ADMIN selects patients and a physician and clicks "Assign Selected" THEN system SHALL call the bulk-assign API and show a success message
3. WHEN all patients are assigned THEN system SHALL display the "All Patients Assigned" empty state
4. WHEN assignment completes THEN system SHALL reload the unassigned patient list to reflect changes
5. WHEN the bulk-assign API call fails THEN system SHALL display an error message and retain the user's patient selections and physician choice
6. WHEN the Reassign tab is first activated THEN system SHALL display a loading spinner while fetching unassigned patients
7. IF user is STAFF or PHYSICIAN THEN system SHALL NOT be able to access the Reassign tab (tab hidden, direct URL redirects to import tab)

### Requirement 5: Tab State and URL Sync

**User Story:** As a user, I want the active tab to be reflected in the URL, so that I can bookmark or share a direct link to a specific tab.

#### Acceptance Criteria

1. WHEN user clicks the "Reassign Patients" tab THEN system SHALL update the URL to `/patient-management?tab=reassign`
2. WHEN user clicks the "Import Patients" tab THEN system SHALL update the URL to `/patient-management` (no query param, default)
3. WHEN user navigates to `/patient-management?tab=reassign` THEN system SHALL display the Reassign Patients tab as active
4. WHEN user navigates to `/patient-management` (no query param) THEN system SHALL display the Import Patients tab as active
5. IF non-ADMIN user navigates to `/patient-management?tab=reassign` THEN system SHALL ignore the param and show the Import tab
6. WHEN user navigates to `/patient-management?tab=<invalid_value>` THEN system SHALL treat it as no query param and show the Import tab

## Non-Functional Requirements

### Performance
- Tab switching SHALL be instant (no API calls on tab switch; data for Reassign tab loads when tab is first activated)
- Lazy-load unassigned patient data only when Reassign tab is first accessed
- Import form state (file, mode, physician) SHALL be preserved when switching tabs

### Security
- Reassign Patients tab SHALL only be visible and accessible to ADMIN role users
- Backend bulk-assign API SHALL continue to enforce ADMIN-only authorization
- No new API endpoints required; existing endpoints reused

### Reliability
- Old URLs (`/import`, `/import/preview/:previewId`, `/admin/patient-assignment`) SHALL redirect properly to avoid broken bookmarks
- Form state SHALL NOT be lost when switching between tabs

### Usability
- Tab labels SHALL be clear and descriptive: "Import Patients" and "Reassign Patients"
- Active tab SHALL have a clear visual indicator (underline, color change, or similar)
- Page title SHALL update to reflect the active tab
- Layout SHALL be responsive and work on mobile devices
- The page SHALL maintain the existing visual style and component patterns used throughout the application
