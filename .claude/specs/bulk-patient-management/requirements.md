# Requirements Document: Bulk Patient Management

## Introduction

Extend the existing Patient Management page (admin-only, `/admin` route area) into a full Patient Management hub that supports bulk operations on patients. Currently, admins can only bulk-assign unassigned patients to physicians via the Reassign tab. This feature adds three new bulk capabilities: Select All / Deselect All across filtered results, bulk unassign (set ownerId to NULL so patients become unassigned), and bulk delete (permanent hard delete). The page will also gain summary cards, advanced filtering (physician, insurance, measure, text search), and confirmation modals with safeguards for destructive operations. All patients are displayed in a single scrollable table with sticky headers, consistent with the main patient grid's no-pagination pattern.

This transforms the existing PatientAssignmentPage from a simple "assign unassigned patients" tool into a comprehensive patient management hub where admins can view all patients, filter by any dimension, and perform bulk assign/unassign/delete operations on filtered selections.

## Alignment with Product Vision

This feature directly supports the product vision in the following ways:

- **Administration**: The product defines ADMIN as the role that can "Manage users, assign patients, view all data, bulk operations." Bulk unassign and bulk delete are natural extensions of the existing bulk-assign capability, completing the ADMIN's patient management toolkit.
- **Replacing Excel workflows**: In Excel, admins could easily select rows, delete, or reassign. This feature brings that same bulk capability to the web application, eliminating a workflow gap that would otherwise push admins back to spreadsheets.
- **Multi-physician support with patient isolation**: Bulk unassign allows admins to reclaim patients from physicians (e.g., when a physician leaves), while bulk assign redistributes them. These operations are critical for multi-physician practice management.
- **Data cleanup and maintenance**: Hard delete enables admins to permanently remove test data, duplicate patients, or records from discontinued insurance systems -- operations that are currently possible only one row at a time via the AG Grid.
- **Audit trail for accountability**: All bulk operations are logged to the audit log, maintaining the system's accountability requirements.

## Requirements

### REQ-BPM-1: Bulk Patient Management Page (New Admin Tab)

**User Story:** As an ADMIN, I want a dedicated patient management view that shows all patients (assigned and unassigned) with bulk operation capabilities, so that I can efficiently manage large patient populations across all physicians.

#### Acceptance Criteria

1. WHEN an ADMIN navigates to the Patient Management page THEN the system SHALL display a new "Bulk Operations" tab (in addition to existing "Import Patients" and "Reassign Patients" tabs)
2. WHEN the "Bulk Operations" tab loads THEN the system SHALL fetch all patients from the backend regardless of assignment status
3. WHEN the tab loads THEN the system SHALL display four summary cards: Total Patients count, Assigned count, Unassigned count, and Insurance Systems count
4. WHEN the tab loads THEN the system SHALL display the patient table with columns: checkbox, Patient Name, Member ID, Physician (or "Unassigned" badge), Measure, Status, Insurance, and Updated date
5. IF the user's role is not ADMIN THEN the system SHALL NOT display the "Bulk Operations" tab
6. WHEN the tab loads THEN the system SHALL display a toolbar with Select All, Deselect All, Assign, Unassign, and Delete buttons on a single row above the filters
7. WHEN the tab loads THEN the system SHALL display all patients in a single scrollable table with sticky headers (no pagination), consistent with the main patient grid pattern

### REQ-BPM-2: Toolbar with Bulk Action Buttons

**User Story:** As an ADMIN, I want a persistent toolbar with selection and action buttons, so that I can quickly select patients and perform bulk operations without scrolling or navigating.

#### Acceptance Criteria

1. WHEN the toolbar renders THEN the system SHALL display selection buttons (Select All, Deselect All) on the left side and action buttons (Assign, Unassign, Delete) on the right side, separated by a visual divider
2. WHEN no patients are selected THEN the system SHALL disable (gray out) the Assign, Unassign, and Delete action buttons
3. WHEN one or more patients are selected THEN the system SHALL enable the action buttons and display the selected count in parentheses on each button (e.g., "Delete (312)")
4. WHEN the Select All button is clicked THEN the system SHALL display the count of patients matching the current filters in the button label (e.g., "Select All (1,247)")
5. WHEN no patients are selected THEN the system SHALL NOT display the Deselect All button
6. WHEN one or more patients are selected THEN the system SHALL display the Deselect All button with a red-tinted style
7. WHEN the toolbar renders THEN the system SHALL remain always visible above the filters and table (not sticky-scrolling, but statically positioned above content)

### REQ-BPM-3: Select All and Deselect All

**User Story:** As an ADMIN, I want to select all patients matching my current filters with one click, so that I can efficiently perform bulk operations on large filtered sets without manually checking each row.

#### Acceptance Criteria

1. WHEN the admin clicks "Select All (N)" THEN the system SHALL select all patients matching the current filter criteria
2. WHEN patients are selected via "Select All" and the admin changes filters THEN the system SHALL clear the selection (selection is tied to the filter state at the time of selection)
3. WHEN the admin clicks "Deselect All" THEN the system SHALL deselect all selected patients and hide the Deselect All button
4. WHEN the admin clicks the header checkbox in the table THEN the system SHALL toggle selection of all visible (filtered) patients
5. WHEN the admin clicks an individual row checkbox THEN the system SHALL toggle that single patient's selection without affecting other selections
6. WHEN the admin clicks anywhere on a table row (not just the checkbox) THEN the system SHALL toggle that row's selection
7. WHEN a patient is selected THEN the system SHALL highlight the row with a blue background tint
8. WHEN Select All is active and all matching patients are selected THEN the system SHALL hide the Select All button and show only Deselect All

### REQ-BPM-4: Filtering and Search

**User Story:** As an ADMIN, I want to filter patients by physician, insurance system, quality measure, and text search, so that I can narrow down the patient list before performing bulk operations on a targeted subset.

#### Acceptance Criteria

1. WHEN the filter bar renders THEN the system SHALL display four filter controls: Physician dropdown, Insurance dropdown, Measure dropdown, and text search input
2. WHEN the admin selects a physician filter THEN the system SHALL show only patients assigned to that physician, with an "Unassigned" option to show only unassigned patients
3. WHEN the admin selects an insurance filter THEN the system SHALL show only patients belonging to that insurance system
4. WHEN the admin selects a measure filter THEN the system SHALL show only patients who have that quality measure
5. WHEN the admin types in the search input THEN the system SHALL filter patients by name (case-insensitive substring match) in real time
6. WHEN multiple filters are active THEN the system SHALL apply them as AND conditions (intersection of all filter criteria)
7. WHEN the admin clicks "Clear" THEN the system SHALL reset all filters to their default (all/empty) values and show the full patient list
8. WHEN filters change THEN the system SHALL clear any existing patient selection
9. WHEN filters change THEN the system SHALL continue displaying global counts in the summary cards (not filtered counts). The table footer SHALL show the count of patients matching the current filters

### REQ-BPM-5: Table Display (No Pagination)

**User Story:** As an ADMIN, I want to see all patients in a single scrollable table, consistent with the main patient grid, so that I can scan the full list without navigating pages.

#### Acceptance Criteria

1. WHEN the table renders THEN the system SHALL display all filtered patients in a single scrollable table (no pagination)
2. WHEN the table renders THEN the table headers SHALL be sticky (fixed at top) with the table body scrollable up to a max-height of 600px
3. WHEN the table footer renders THEN the system SHALL display the total count of patients matching the current filters (e.g., "1,247 patients")
4. WHEN patients are selected THEN the table footer SHALL also display the total number of selected patients (e.g., "312 of 1,247 selected")

### REQ-BPM-6: Bulk Assign to Physician

**User Story:** As an ADMIN, I want to assign multiple selected patients to a physician in one operation, so that I can efficiently redistribute patient loads across physicians.

#### Acceptance Criteria

1. WHEN the admin clicks the "Assign" button with patients selected THEN the system SHALL open an Assign modal dialog
2. WHEN the Assign modal opens THEN the system SHALL display: a summary showing the count of patients to be assigned, a physician dropdown, a preview list of affected patients (first 10 with "...and N more" overflow), and an audit log note
3. WHEN no physician is selected in the modal dropdown THEN the system SHALL disable the "Assign" confirm button
4. WHEN the admin selects a physician and clicks "Assign" THEN the system SHALL call the backend bulk-assign API with the selected patient IDs and the target physician's ownerId
5. WHEN the bulk assign succeeds THEN the system SHALL close the modal, display a success toast notification, refresh the patient list, clear the selection, and update summary cards
6. WHEN the bulk assign fails THEN the system SHALL display an error toast notification and keep the modal open with the user's selections intact
7. WHEN the Assign modal opens THEN the physician dropdown SHALL only list active users with the PHYSICIAN role

### REQ-BPM-7: Bulk Unassign

**User Story:** As an ADMIN, I want to unassign multiple patients from their physicians in one operation, so that I can reclaim patients when a physician leaves or when patient assignments need to be redistributed.

#### Acceptance Criteria

1. WHEN the admin clicks the "Unassign" button with patients selected THEN the system SHALL open an Unassign confirmation modal
2. WHEN the Unassign modal opens THEN the system SHALL display: a warning summary showing the count of patients to be unassigned, a warning message that unassigned patients will not appear in any physician's view until reassigned, a preview list of affected patients (first 10 with "...and N more" overflow), and an audit log note
3. WHEN the admin clicks "Unassign Patients" in the modal THEN the system SHALL call the backend bulk-assign API with ownerId set to null for all selected patient IDs
4. WHEN the bulk unassign succeeds THEN the system SHALL close the modal, display a success toast notification, refresh the patient list, clear the selection, and update summary cards
5. WHEN the bulk unassign fails THEN the system SHALL display an error toast notification and keep the modal open
6. IF all selected patients are already unassigned THEN the system SHALL still allow the operation (idempotent; no error)
7. WHEN unassign is called via the backend API THEN the system SHALL set ownerId to NULL for each selected patient, making them visible only to ADMIN users

### REQ-BPM-8: Bulk Delete (Permanent Hard Delete)

**User Story:** As an ADMIN, I want to permanently delete multiple patients in one operation, so that I can clean up test data, duplicate records, or records from discontinued insurance systems without deleting them one at a time.

#### Acceptance Criteria

1. WHEN the admin clicks the "Delete" button with patients selected THEN the system SHALL open a Delete confirmation modal
2. WHEN the Delete modal opens THEN the system SHALL display: a danger-styled summary showing the count of patients to be permanently deleted, a warning that this action cannot be undone, a preview list of affected patients (first 10 with "...and N more" overflow), a text input requiring the admin to type "DELETE" to confirm, and an audit log note
3. WHEN the delete confirmation input does not exactly match the string "DELETE" (case-sensitive) THEN the system SHALL keep the "Delete Patients" confirm button disabled
4. WHEN the delete confirmation input matches "DELETE" THEN the system SHALL enable the "Delete Patients" confirm button
5. WHEN the admin clicks "Delete Patients" after typing "DELETE" THEN the system SHALL call the backend bulk-delete API with all selected patient IDs
6. WHEN the bulk delete succeeds THEN the system SHALL close the modal, display a success toast notification, refresh the patient list, clear the selection, and update summary cards
7. WHEN the bulk delete fails THEN the system SHALL display an error toast notification and keep the modal open
8. WHEN a patient is deleted THEN the system SHALL permanently remove the Patient record and all associated PatientMeasure records (hard delete via Prisma's `onDelete: Cascade` on the PatientMeasure→Patient relation). Note: this is a new capability — no single-patient-delete endpoint exists today; only PatientMeasure-level delete exists in dataHandlers.ts
9. WHEN the Delete modal is closed and reopened THEN the system SHALL reset the confirmation input to empty

### REQ-BPM-9: Backend Bulk Delete API Endpoint

**User Story:** As the system, I need a backend API endpoint for bulk patient deletion, so that the frontend can request permanent deletion of multiple patients in a single atomic operation.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/api/admin/patients/bulk-delete` with a body containing `{ patientIds: number[] }` THEN the system SHALL validate that patientIds is a non-empty array of integers
2. WHEN the request is valid THEN the system SHALL delete all specified patients and their associated PatientMeasure records within a single database transaction
3. WHEN the deletion completes THEN the system SHALL create an audit log entry recording the action ("BULK_DELETE_PATIENTS"), the admin's user ID and email, the list of deleted patient IDs, and the count of deleted records
4. WHEN the deletion completes THEN the system SHALL return a JSON response with `{ success: true, data: { deleted: <count> }, message: "Successfully deleted N patient(s)" }`
5. IF any patientId does not exist THEN the system SHALL skip it without error (idempotent behavior; deleteMany semantics)
6. IF the request is missing patientIds or it is empty THEN the system SHALL return HTTP 400 with a VALIDATION_ERROR code
7. WHEN the endpoint is called THEN the system SHALL require authentication and ADMIN role (via requireAuth + requireRole(['ADMIN']) middleware)
8. WHEN the deletion is performed THEN the system SHALL use Prisma's cascading delete behavior (PatientMeasure has `onDelete: Cascade` on the patient relation)

### REQ-BPM-10: Backend Bulk Patient List API Endpoint

**User Story:** As the system, I need a backend API endpoint that returns all patients with their physician, insurance, and measure information, so that the frontend Bulk Operations tab can display and filter the full patient list.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/admin/patients` THEN the system SHALL return all patients regardless of assignment status
2. WHEN the endpoint returns data THEN each patient record SHALL include: id, memberName, memberDob, memberTelephone, ownerId, owner displayName (or null if unassigned), insuranceGroup, measure count, latest quality measure, latest measure status, and updatedAt timestamp
3. WHEN the endpoint is called THEN the system SHALL require authentication and ADMIN role
4. WHEN the endpoint returns data THEN patients SHALL be ordered by memberName ascending (default sort)
5. WHEN the endpoint returns data THEN the response SHALL return JSON in the format: `{ success: true, data: { patients: [...], summary: { totalPatients: number, assignedCount: number, unassignedCount: number, insuranceSystemCount: number } } }`

### REQ-BPM-11: Toast Notifications

**User Story:** As an ADMIN, I want clear success and error notifications after bulk operations, so that I know whether my operation completed successfully or needs attention.

#### Acceptance Criteria

1. WHEN a bulk operation succeeds THEN the system SHALL display a green success toast in the bottom-right corner of the screen with a message describing the completed operation (e.g., "Successfully assigned 312 patients to Dr. Smith")
2. WHEN a bulk operation fails THEN the system SHALL display a red error toast with the error message from the backend
3. WHEN a toast is displayed THEN the system SHALL automatically dismiss it after 5 seconds
4. WHEN a new toast is triggered while another is visible THEN the system SHALL replace the existing toast with the new one

### REQ-BPM-12: Confirmation Modal Patient Preview

**User Story:** As an ADMIN, I want to see a preview of affected patients before confirming a bulk operation, so that I can verify I have the right patients selected before executing a potentially destructive action.

#### Acceptance Criteria

1. WHEN a confirmation modal opens THEN the system SHALL display up to 10 patients in a scrollable preview list showing patient name and a detail field (physician for unassign, member ID for delete, current physician for assign)
2. IF more than 10 patients are selected THEN the system SHALL display "...and N more" below the preview list, where N is the count of patients beyond the first 10
3. WHEN the modal opens THEN the patient preview list SHALL have a max-height of 200px and scroll vertically if needed
4. WHEN the modal opens THEN the system SHALL display an audit log note showing the admin's email address (e.g., "Recorded in audit log -- admin@clinic.com")

### REQ-BPM-13: Loading, Empty, and Error States

**User Story:** As an ADMIN, I want clear visual feedback when data is loading, when no patients exist, or when my filters return no results, so that I understand the current state of the page.

#### Acceptance Criteria

1. WHEN the patient list API call is in progress THEN the system SHALL display a loading spinner in place of the table
2. WHEN no patients exist in the system THEN the system SHALL display an empty state message (e.g., "No patients found. Import patients to get started.")
3. WHEN filters return zero results THEN the system SHALL display a "No patients match your filters" message with a "Clear Filters" link
4. WHEN a bulk operation API call is in progress THEN the system SHALL disable the confirm button and show a loading spinner on the button

### REQ-BPM-14: Concurrent Operation Handling

**User Story:** As the system, I need to handle concurrent bulk operations gracefully, so that data integrity is maintained when multiple admins operate simultaneously.

#### Acceptance Criteria

1. WHEN a bulk operation includes patient IDs that no longer exist (deleted by another user since selection) THEN the system SHALL skip missing patients without error and report the actual count of affected records in the success message
2. WHEN a bulk delete completes THEN the system SHALL broadcast a Socket.IO event to notify other connected users to refresh their patient data
3. WHEN a bulk assign/unassign completes THEN the system SHALL broadcast a Socket.IO event to notify affected physician rooms to refresh their data
4. WHEN the admin's patient list becomes stale (another admin made changes) THEN the system SHALL refresh the list on the next bulk operation attempt if the response count differs from the expected count

## Non-Functional Requirements

### Performance

- NFR-PERF-1: The initial patient list load SHALL complete within 3 seconds for datasets up to 5,000 patients
- NFR-PERF-2: Client-side filtering (physician, insurance, measure, text search) SHALL update the displayed results within 200ms
- NFR-PERF-3: "Select All" on 5,000+ patients SHALL complete within 100ms (client-side Set-based selection, no per-row DOM manipulation)
- NFR-PERF-4: Bulk delete of 500 patients SHALL complete the database transaction within 10 seconds
- NFR-PERF-5: Rendering all patients (up to 5,000) in a single scrollable table SHALL maintain smooth scrolling performance via sticky headers and CSS-only rendering

### Security

- NFR-SEC-1: All bulk operation endpoints SHALL require authentication (JWT) and ADMIN role authorization
- NFR-SEC-2: The frontend "Bulk Operations" tab SHALL be hidden from non-ADMIN users
- NFR-SEC-3: The bulk delete endpoint SHALL validate that the requesting user has ADMIN role, even if the route middleware already checks this (defense in depth)
- NFR-SEC-4: Bulk delete confirmation SHALL require typing "DELETE" to prevent accidental data loss
- NFR-SEC-5: All bulk operations (assign, unassign, delete) SHALL be recorded in the audit log with the admin's user ID, email, IP address, the list of affected patient IDs, and a timestamp
- NFR-SEC-6: Bulk operation endpoints (delete, assign, unassign) SHALL NOT accept requests larger than 5,000 patient IDs in a single call to prevent denial-of-service via excessively large payloads

### Reliability

- NFR-REL-1: Bulk delete SHALL execute within a single database transaction; if any individual delete fails, the entire operation SHALL roll back
- NFR-REL-2: Bulk assign/unassign SHALL execute within a single database transaction (matching existing behavior)
- NFR-REL-3: IF the backend returns a partial success or error during a bulk operation THEN the frontend SHALL refresh the patient list to show the current true state
- NFR-REL-4: The confirmation modals SHALL prevent double-submission by disabling the confirm button while the API call is in progress (show loading spinner)

### Usability

- NFR-USE-1: Action buttons SHALL use color coding consistent with their severity: blue for Assign, amber/warning for Unassign, red/danger for Delete
- NFR-USE-2: The Delete modal SHALL use a danger-themed design (red accents) to clearly communicate the destructive nature of the operation
- NFR-USE-3: The Unassign modal SHALL use a warning-themed design (amber/yellow accents) to communicate the impact without implying data loss
- NFR-USE-4: Table rows SHALL highlight on hover for visual feedback
- NFR-USE-5: Selected rows SHALL have a distinct blue background tint
- NFR-USE-6: The "Unassigned" physician value SHALL display as a red-tinted italic badge to stand out visually
- NFR-USE-7: Numbers in the UI (patient counts, selection counts) SHALL use locale-appropriate formatting (e.g., "1,247" not "1247")
- NFR-USE-8: The page layout SHALL be responsive, with summary cards collapsing to 2 columns on tablet and 1 column on mobile
- NFR-USE-9: The page title in the browser tab SHALL update to reflect the active tab (e.g., "Patient Management - Bulk Operations")
- NFR-USE-10: Sticky table headers SHALL remain visible while scrolling through the patient list

## Assumptions and Constraints

### Assumptions

- ASM-1: The existing `PATCH /api/admin/patients/bulk-assign` endpoint already supports ownerId: null for unassigning, so no new unassign endpoint is needed
- ASM-2: The existing `PatientMeasure` model has `onDelete: Cascade` on the patient relation, so deleting a Patient automatically deletes its measures
- ASM-3: The patient data set size per deployment is expected to be under 10,000 patients; all patients are rendered in a single scrollable table (no pagination), consistent with the main patient grid. Server-side pagination is not required in this phase
- ASM-4: Filtering will be performed client-side on the full patient list fetched from the backend; server-side filtering may be added in a future phase if datasets grow beyond 10,000
- ASM-5: The POC UI (poc-bulk-patient-management.html) has been approved by the user and serves as the authoritative UI reference

### Constraints

- CON-1: Only ADMIN role users can access bulk operations; PHYSICIAN and STAFF roles have no access to this tab
- CON-2: Delete is a hard delete (permanent). Note: no Patient-level delete endpoint exists today — only PatientMeasure-level delete exists in dataHandlers.ts. This is new functionality. There is no soft-delete or archiving mechanism
- CON-3: The frontend uses React 18, Tailwind CSS, Zustand for state, and Axios for HTTP -- all new components must follow these patterns
- CON-4: The backend uses Express, Prisma, and TypeScript -- new endpoints must follow the existing route handler pattern (try/catch with createError and next(error))
- CON-5: All new API endpoints must be registered under the existing admin routes (admin.routes.ts) which already applies requireAuth and requireRole(['ADMIN']) middleware
- CON-6: No new database migrations are required -- all operations use existing Patient and PatientMeasure models
- CON-7: AG Grid is NOT used for this page; the table is a standard HTML table with Tailwind styling (matching the existing PatientAssignmentPage pattern)
