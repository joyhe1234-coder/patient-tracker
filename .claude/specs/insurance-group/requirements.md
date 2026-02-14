# Requirements Document: Insurance Group

## Introduction

Add an `insuranceGroup` field to patients that associates each patient with the healthcare system (insurance group) from which they were imported. Currently, the `systemId` dropdown on the import page only controls column mapping via `configLoader.ts` and is not persisted on the patient record. This feature stores the selected healthcare system as the patient's `insuranceGroup`, enabling per-group filtering in the patient grid. The primary use case is a multi-payer medical office that needs to view and manage patients by insurance group (e.g., Hill Healthcare, Kaiser, No Insurance) while preserving the existing role-based access control scoping.

## Alignment with Product Vision

This feature supports several goals from `product.md`:

- **Multi-physician support with patient isolation**: Insurance group filtering adds a second dimension of data segmentation beyond physician ownership, enabling offices that manage patients across multiple healthcare systems to focus on one group at a time.
- **Importing data from healthcare systems**: The import pipeline already selects a healthcare system (`systemId`); this feature closes the gap by persisting that selection on the patient record so the source is always known.
- **Real-time compliance visibility**: Filtering by insurance group lets staff quickly narrow the grid to patients from a specific payer for targeted compliance reviews or reporting.
- **Replacing Excel-based workflows**: Excel users often maintain separate sheets per insurance group; a grid-level filter replaces that pattern in a single view.

## Requirements

### REQ-IG-1: Patient Insurance Group Field

**User Story:** As a system administrator, I want each patient record to store which insurance group they belong to, so that patients can be categorized and filtered by their healthcare system.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the `patients` table SHALL have a new nullable column `insurance_group` of type `String` (mapped to Prisma field `insuranceGroup`).
2. WHEN a new patient is created via import THEN the system SHALL set the patient's `insuranceGroup` to the `systemId` value selected on the import page.
3. WHEN a new patient is created manually via the Add Row modal THEN the system SHALL set the patient's `insuranceGroup` to `null` (no insurance group specified).
4. WHEN a patient's `insuranceGroup` is `null` THEN the system SHALL treat this patient as having "No Insurance" group for filtering purposes.
5. IF an existing patient record already exists in the database before this feature is deployed THEN the system SHALL set that patient's `insuranceGroup` to `'hill'` via a data migration.
6. WHEN the `GET /api/data` endpoint returns grid data THEN each row SHALL include the patient's `insuranceGroup` field in the response payload.

### REQ-IG-2: Import Pipeline Sets Insurance Group

**User Story:** As a user importing patient data, I want the selected healthcare system to be saved as the patient's insurance group, so that I can later filter patients by which system they came from.

#### Acceptance Criteria

1. WHEN a user selects a healthcare system (e.g., `hill`) on the import page and completes the import THEN the system SHALL set `insuranceGroup` to the selected `systemId` value for all patients created or updated during that import.
2. WHEN the import executor creates a new patient record THEN the system SHALL pass the `systemId` from the preview cache to the `patient.create` call and set `insuranceGroup` to that value.
3. WHEN the import executor finds an existing patient record during import THEN the system SHALL update the patient's `insuranceGroup` to the current import's `systemId` value (re-import updates the insurance group).
4. WHEN the import preview is generated THEN the system SHALL store the `systemId` in the preview cache alongside the existing `mode`, `diff`, and `targetOwnerId` fields.
5. WHEN the import executor runs THEN the system SHALL read the `systemId` from the preview cache and use it to set `insuranceGroup` on all affected patient records.
6. IF the `systemId` is not present in the preview cache (for backward compatibility with any in-flight previews during deployment) THEN the system SHALL default to `'hill'`.

### REQ-IG-3: Grid Insurance Group Dropdown Filter

**User Story:** As a user viewing the patient grid, I want a dropdown filter for insurance group, so that I can quickly narrow the grid to patients from a specific healthcare system.

#### Acceptance Criteria

1. WHEN the patient grid page loads THEN the system SHALL display an insurance group dropdown filter in the `StatusFilterBar` component, positioned between the Quality Measure dropdown and the Search input.
2. WHEN the dropdown is rendered THEN the system SHALL display the following options in order: "All", followed by registered system names from the `systems.json` registry (e.g., "Hill"), followed by "No Insurance".
3. WHEN an ADMIN user loads the patient grid THEN the insurance group dropdown SHALL default to "Hill".
4. WHEN a PHYSICIAN user loads the patient grid THEN the insurance group dropdown SHALL default to "Hill".
5. WHEN a STAFF user loads the patient grid THEN the insurance group dropdown SHALL default to "Hill".
6. WHEN the user selects a specific insurance group (e.g., "Hill") THEN the system SHALL filter the grid to show only patients whose `insuranceGroup` matches the selected value.
7. WHEN the user selects "No Insurance" THEN the system SHALL filter the grid to show only patients whose `insuranceGroup` is `null`.
8. WHEN the user selects "All" THEN the system SHALL show patients from all insurance groups (no insurance group filtering applied).
9. WHEN the insurance group filter is active (not "All") THEN the dropdown SHALL have a visual indicator (e.g., ring/border highlight) matching the existing Quality Measure dropdown behavior when a non-default value is selected.
10. WHEN the insurance group filter changes THEN the status color chip counts in the `StatusFilterBar` SHALL update to reflect only the visible (filtered) rows.

### REQ-IG-4: Server-Side Insurance Group Filtering

**User Story:** As a backend developer, I want the data API to support insurance group filtering, so that large datasets can be filtered at the database level instead of client-side only.

#### Acceptance Criteria

1. WHEN the `GET /api/data` endpoint receives an `insuranceGroup` query parameter THEN the system SHALL filter patient measures to only return rows where the patient's `insuranceGroup` matches the provided value.
2. WHEN the `GET /api/data` endpoint receives `insuranceGroup=null` or `insuranceGroup=none` THEN the system SHALL filter to patients where `insuranceGroup` IS NULL.
3. IF the `insuranceGroup` query parameter is omitted or set to `all` THEN the system SHALL return patients from all insurance groups (no insurance group filter applied).
4. WHEN the insurance group filter is combined with the existing `physicianId` filter THEN the system SHALL apply both filters (AND logic): patients must match both the owner/physician filter AND the insurance group filter.
5. WHEN the frontend requests data with an insurance group filter THEN the frontend SHALL pass the `insuranceGroup` query parameter to the `GET /api/data` endpoint.

### REQ-IG-5: Role-Based Insurance Group Scoping

**User Story:** As an ADMIN, I want to see all patients by default but be able to filter by insurance group, so that I can focus on specific insurance groups without losing access to the full dataset.

#### Acceptance Criteria

1. WHEN an ADMIN user loads the patient grid THEN the system SHALL show patients from the "Hill" insurance group by default (dropdown defaults to "Hill"), but the ADMIN can change the dropdown to "All" or any other group.
2. WHEN a PHYSICIAN user loads the patient grid THEN the system SHALL show only the physician's own patients (existing ownership filter), further filtered to "Hill" insurance group by default, with the ability to change the dropdown to "All" or another group.
3. WHEN a STAFF user loads the patient grid THEN the system SHALL show only the selected physician's patients (existing physician selection), further filtered to "Hill" insurance group by default, with the ability to change the dropdown to "All" or another group.
4. WHEN the insurance group filter is changed THEN the system SHALL preserve the existing physician ownership scoping -- the insurance group filter is an additional filter on top of ownership, not a replacement for it.
5. WHEN the physician selector in the header is changed THEN the system SHALL preserve the current insurance group filter selection (the two filters are independent).

### REQ-IG-6: Insurance Group Persistence on Re-Import

**User Story:** As a user, I want a patient's insurance group to update when I re-import them from a different healthcare system, so that the patient's insurance group always reflects their most recent import source.

#### Acceptance Criteria

1. WHEN a patient is imported from system A and later re-imported from system B THEN the system SHALL update the patient's `insuranceGroup` from A to B.
2. WHEN a patient exists with `insuranceGroup = 'hill'` and is re-imported via a future system (e.g., `kaiser`) THEN the patient's `insuranceGroup` SHALL be updated to `'kaiser'`.
3. WHEN re-import updates the insurance group THEN the system SHALL NOT change any other patient fields (name, DOB, telephone, address) unless the import data explicitly provides new values for those fields.
4. WHEN a patient is imported but already has the same `insuranceGroup` as the import's `systemId` THEN the system SHALL leave the `insuranceGroup` unchanged (idempotent).

### REQ-IG-7: Insurance Group Options from Registry

**User Story:** As a system administrator, I want the insurance group filter options to be driven by the `systems.json` registry, so that adding a new healthcare system automatically makes it available as a filter option.

#### Acceptance Criteria

1. WHEN the frontend loads the insurance group filter dropdown THEN the system SHALL fetch the available systems from the backend `GET /api/import/systems` endpoint.
2. WHEN the systems endpoint returns the list of registered systems THEN the dropdown SHALL include each system's `name` as a selectable option (e.g., "Hill Healthcare" displayed as "Hill" or using the system's `name` property).
3. WHEN a new system is added to `systems.json` (e.g., `kaiser`) THEN the insurance group dropdown SHALL automatically include it as an option without frontend code changes.
4. WHEN the systems endpoint fails to load THEN the dropdown SHALL fall back to a hardcoded list: ["All", "Hill", "No Insurance"].
5. WHEN the dropdown options are constructed THEN the order SHALL be: "All" (always first), then systems from the registry sorted alphabetically by name, then "No Insurance" (always last).

### REQ-IG-8: Data Migration for Existing Patients

**User Story:** As a system administrator, I want all existing patients to be assigned to the "Hill" insurance group during the migration, so that the grid filter works correctly from day one without manual data cleanup.

#### Acceptance Criteria

1. WHEN the Prisma migration runs THEN the system SHALL add the `insurance_group` column to the `patients` table as a nullable `String`.
2. WHEN the migration completes THEN the system SHALL execute a data migration that sets `insurance_group = 'hill'` for ALL existing patient records where `insurance_group IS NULL`.
3. WHEN the data migration runs THEN it SHALL be idempotent: running it multiple times SHALL produce the same result (only update rows where `insurance_group IS NULL`).
4. WHEN the migration completes THEN the system SHALL NOT alter any other columns on the patient record.

## Non-Functional Requirements

### Performance

- NFR-IG-1: The insurance group filter SHALL be applied server-side via the `GET /api/data` endpoint query parameter to avoid transferring unnecessary data over the network.
- NFR-IG-2: The `patients` table SHALL have a database index on the `insurance_group` column to ensure efficient filtering.
- NFR-IG-3: The insurance group dropdown options SHALL be cached on the frontend after initial load (no re-fetch on every page visit within the same session).
- NFR-IG-4: Changing the insurance group filter SHALL trigger a new data fetch from the server. The grid SHALL display a loading state during the fetch, consistent with existing physician selector behavior.

### Security

- NFR-IG-5: The insurance group filter SHALL NOT bypass existing role-based access control. A PHYSICIAN SHALL still only see their own patients, regardless of insurance group filter. A STAFF user SHALL still only see their assigned physician's patients.
- NFR-IG-6: The `insuranceGroup` query parameter on `GET /api/data` SHALL be validated to prevent SQL injection or invalid values. Only values matching registered system IDs, `null`/`none`, or `all` SHALL be accepted.
- NFR-IG-7: The insurance group field SHALL be logged in the audit trail when it changes during import (included in the `changes` JSON of the audit log entry).

### Reliability

- NFR-IG-8: If the `GET /api/import/systems` endpoint fails, the insurance group dropdown SHALL fall back to hardcoded defaults (`["All", "Hill", "No Insurance"]`) so the filter remains functional.
- NFR-IG-9: The data migration SHALL be backward-compatible. If the application is rolled back, the `insurance_group` column can remain in the database without causing errors (the column is nullable and not required by older code).
- NFR-IG-10: In-flight import previews created before the migration SHALL still execute correctly. If the preview cache does not contain a `systemId`, the system SHALL default to `'hill'`.

### Usability

- NFR-IG-11: The insurance group dropdown SHALL use the same visual style as the existing Quality Measure dropdown in the `StatusFilterBar` (consistent font size, border, focus ring, active indicator).
- NFR-IG-12: The dropdown label SHALL be clear and concise. Options SHALL use display names (e.g., "Hill" not "hill", "No Insurance" not "null").
- NFR-IG-13: The status bar at the bottom of the grid SHALL include the active insurance group filter in the filter summary text (e.g., "Insurance: Hill | Color: Completed").
- NFR-IG-14: WHEN the user has never changed the insurance group filter THEN it SHALL display "Hill" as the default selection without requiring any user action. This provides an intuitive starting point since Hill is the currently dominant insurance group.

## Assumptions and Constraints

### Assumptions

- ASM-IG-1: The `systems.json` registry is the authoritative source for valid insurance group values. The `insuranceGroup` field on the patient stores the system `id` (e.g., `'hill'`, `'kaiser'`), not the display name.
- ASM-IG-2: A patient belongs to exactly one insurance group at a time. There is no multi-insurance-group scenario.
- ASM-IG-3: The current production database contains only Hill Healthcare patients. Setting `'hill'` as the default for existing patients is correct.
- ASM-IG-4: Manually created rows (via Add Row) have `insuranceGroup = null` because they were not imported from any system. These appear under "No Insurance" in the filter.
- ASM-IG-5: The insurance group filter is independent of the physician selector. Both filters can be active simultaneously and are combined with AND logic.
- ASM-IG-6: Duplicate detection (uniqueness constraint `memberName + memberDob`) is unaffected by insurance group. One patient record has one insurance group, regardless of how many measure rows exist.

### Constraints

- CON-IG-1: AG Grid Community edition is used; the filter must be implemented as an external dropdown in the `StatusFilterBar`, not as an AG Grid column filter.
- CON-IG-2: The preview cache is in-memory. The `systemId` must be stored in the preview entry so it survives between the preview and execute steps.
- CON-IG-3: The patient uniqueness constraint (`memberName + memberDob`) does not change. A patient cannot exist in multiple insurance groups simultaneously.
- CON-IG-4: The `insuranceGroup` column is nullable to support manually-created patients that have no import source. The filter must handle `null` values explicitly.
- CON-IG-5: No new environment variables or infrastructure changes are required for this feature.

## Edge Cases

### EC-IG-1: Patient Imported Then Manually Added Row
WHEN a patient is imported from Hill (insuranceGroup = 'hill') AND a user later manually adds a new row for the same patient (same name + DOB) via Add Row THEN the patient's `insuranceGroup` SHALL remain 'hill' because the patient already exists. The new measure row inherits the existing patient record, including its `insuranceGroup`.

### EC-IG-2: Manual Row Then Import
WHEN a user manually creates a patient via Add Row (insuranceGroup = null) AND that patient is later imported from Hill THEN the import SHALL update the patient's `insuranceGroup` from `null` to `'hill'`.

### EC-IG-3: Concurrent Imports from Different Systems
WHEN two users concurrently import the same patient from different systems THEN the last import to execute SHALL win (standard database update behavior). The patient's `insuranceGroup` will reflect whichever import committed last.

### EC-IG-4: Filter Active During Import
WHEN a user has the insurance group filter set to "Hill" AND an import from a new system "Kaiser" completes THEN the newly imported Kaiser patients SHALL NOT appear in the grid until the user changes the filter to "All" or "Kaiser". The grid should automatically refresh data (via existing socket-based data refresh) but the filter remains applied.

### EC-IG-5: Unknown Insurance Group Value
WHEN the database contains a patient with an `insuranceGroup` value that does not match any system in `systems.json` (e.g., a system was removed from the registry) THEN the patient SHALL appear when the "All" filter is selected. The patient SHALL NOT appear under any specific insurance group filter since its value does not match a registered system.

### EC-IG-6: Empty Database
WHEN the database has no patients THEN the insurance group dropdown SHALL still render with all options ("All", "Hill", "No Insurance"). The status color chip counts SHALL show 0 for all categories.

### EC-IG-7: All Patients Have Null Insurance Group
WHEN all patients have `insuranceGroup = null` AND the user selects "Hill" filter THEN the grid SHALL show zero rows. The status bar SHALL display "0 of N rows" to indicate filtering is active.

### EC-IG-8: Patient Ownership Change via Import
WHEN a patient is reassigned to a different physician via import AND the import also changes the insurance group THEN both the `ownerId` and `insuranceGroup` SHALL be updated in the same transaction.

### EC-IG-9: Replace Mode Import
WHEN a user performs a Replace All import THEN all deleted-and-recreated patients SHALL have their `insuranceGroup` set to the import's `systemId`. Pre-existing insurance group values on deleted patients are not preserved.

### EC-IG-10: Duplicate Row Operation
WHEN a user clicks "Duplicate Mbr" on a patient row THEN the new measure row SHALL inherit the same patient record (including its `insuranceGroup`). No insurance group change occurs.
