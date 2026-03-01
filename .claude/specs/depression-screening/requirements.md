# Requirements Document: Depression Screening

## Introduction

Add "Depression Screening" as a new quality measure under the existing "Screening" request type. This measure tracks the depression screening workflow for patients, from initial outreach through scheduling, completion, decline, or determination of inapplicability. The feature uses the same cascading dropdown, status color, auto-date stamping, and countdown timer infrastructure already in place for other screening measures (Breast Cancer, Colon Cancer, Cervical Cancer).

Source: Handwritten requirement photo (IMG_9695.HEIC) showing tracking cell behavior for each status.

## Alignment with Product Vision

This feature directly supports the product vision of replacing Excel-based quality measure tracking for medical offices. Depression Screening is a standard HEDIS/CMS quality measure commonly tracked alongside the 13 existing measures. Adding it:

- Expands the Quality Measures catalog from 13 to 14, increasing the system's coverage of real-world clinical workflows.
- Fits within the existing "Screening" request type, requiring no new request types or structural changes.
- Reuses the established cascading dropdown pattern (Request Type -> Quality Measure -> Measure Status), maintaining UI consistency.
- Leverages the existing `baseDueDays` countdown timer and overdue detection system for the "Called to schedule" (7-day) and "Visit scheduled" (1-day after scheduled date) statuses.
- Uses the established 8-color row system (white, blue, yellow, green, gray, purple, red for overdue) with no new colors required.

## Requirements

### REQ-DS-1: Dropdown Configuration -- Depression Screening as a Quality Measure

**User Story:** As a physician or staff member, I want "Depression Screening" to appear as a selectable quality measure when I choose the "Screening" request type, so that I can track depression screening workflows for my patients.

#### Acceptance Criteria

1. WHEN a user selects "Screening" as the Request Type, THEN the Quality Measure dropdown SHALL include "Depression Screening" alongside the existing three screening measures (Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening).
2. WHEN a user selects "Depression Screening" as the Quality Measure, THEN the Measure Status dropdown SHALL display exactly 7 statuses in this order: "Not Addressed", "Called to schedule", "Visit scheduled", "Screening complete", "Screening unnecessary", "Patient declined", "No longer applicable".
3. IF the "Screening" request type is selected, THEN the Quality Measure dropdown SHALL list all 4 screening measures in alphabetical order.
4. WHEN a user changes the Quality Measure away from "Depression Screening", THEN the system SHALL clear Measure Status, Status Date, Tracking 1/2/3, Due Date, and Time Interval (standard cascading behavior).

### REQ-DS-2: Status Color Mapping

**User Story:** As a user viewing the patient grid, I want Depression Screening rows to display the correct background color for each status, so that I can visually assess patient progress at a glance.

#### Acceptance Criteria

1. WHEN a Depression Screening row has Measure Status "Not Addressed", THEN the row SHALL display a white background (#FFFFFF).
2. WHEN a Depression Screening row has Measure Status "Called to schedule", THEN the row SHALL display a blue background (#CCE5FF).
3. WHEN a Depression Screening row has Measure Status "Visit scheduled", THEN the row SHALL display a yellow background (#FFF9E6).
4. WHEN a Depression Screening row has Measure Status "Screening complete", THEN the row SHALL display a green background (#D4EDDA).
5. WHEN a Depression Screening row has Measure Status "Screening unnecessary", THEN the row SHALL display a gray background (#E9EBF3).
6. WHEN a Depression Screening row has Measure Status "Patient declined", THEN the row SHALL display a purple background (#E5D9F2).
7. WHEN a Depression Screening row has Measure Status "No longer applicable", THEN the row SHALL display a gray background (#E9EBF3).

### REQ-DS-3: Auto-Date Stamping and Date Prompts

**User Story:** As a user updating a Depression Screening status, I want the system to prompt me for the appropriate date (e.g., "Date Called", "Date Scheduled") and auto-calculate the due date, so that I do not need to manually compute follow-up timelines.

#### Acceptance Criteria

1. WHEN a user sets the Measure Status to "Called to schedule", THEN the Status Date prompt SHALL display "Date Called".
2. WHEN a user sets the Measure Status to "Visit scheduled", THEN the Status Date prompt SHALL display "Date Scheduled".
3. WHEN a user sets the Measure Status to "Screening complete", THEN the Status Date prompt SHALL display "Date Completed".
4. WHEN a user sets the Measure Status to "Screening unnecessary", THEN the Status Date prompt SHALL display "Date Determined".
5. WHEN a user sets the Measure Status to "Patient declined", THEN the Status Date prompt SHALL display "Date Declined".
6. WHEN a user sets the Measure Status to "No longer applicable", THEN the Status Date prompt SHALL display "Date Determined".
7. WHEN a user sets the Measure Status to "Not Addressed", THEN the system SHALL NOT display a date prompt (null).

### REQ-DS-4: Countdown Timers (baseDueDays)

**User Story:** As a user tracking depression screenings, I want automatic countdown timers on active statuses so that overdue follow-ups are visually flagged in red.

#### Acceptance Criteria

1. WHEN a user sets the Measure Status to "Called to schedule" and enters a Status Date, THEN the system SHALL calculate `dueDate = statusDate + 7 days` and set `timeIntervalDays = 7`.
2. WHEN a user sets the Measure Status to "Visit scheduled" and enters a Status Date, THEN the system SHALL calculate `dueDate = statusDate + 1 day` and set `timeIntervalDays = 1`.
3. IF the Measure Status is "Screening complete", THEN `baseDueDays` SHALL be 365 and the system SHALL calculate `dueDate = statusDate + 365 days` and set `timeIntervalDays = 365` (annual rescreening, same as other completed green statuses like AWV completed).
4. IF the Measure Status is "Screening unnecessary", THEN `baseDueDays` SHALL be null and no due date SHALL be calculated.
5. IF the Measure Status is "Patient declined", THEN `baseDueDays` SHALL be null and no due date SHALL be calculated.
6. IF the Measure Status is "No longer applicable", THEN `baseDueDays` SHALL be null and no due date SHALL be calculated.
7. IF the Measure Status is "Not Addressed", THEN `baseDueDays` SHALL be null and no due date SHALL be calculated.

### REQ-DS-5: Overdue Detection

**User Story:** As a user, I want Depression Screening rows to turn red when the due date has passed, so that I can prioritize overdue follow-ups.

#### Acceptance Criteria

1. WHEN a Depression Screening row has a due date AND the due date is before today's date, AND the Measure Status is "Called to schedule", "Visit scheduled", or "Screening complete", THEN the row SHALL display a red background (#FFCDD2), overriding the normal blue, yellow, or green color.
2. IF the Measure Status is "Patient declined" (purple) or "No longer applicable" / "Screening unnecessary" (gray), THEN the row SHALL NOT turn red regardless of due date.
3. "Screening complete" follows the same overdue rules as all other green statuses — it CAN turn red when its annual due date passes (indicates rescreening needed).

### REQ-DS-6: Database Seed Data

**User Story:** As a developer or system administrator performing initial setup, I want Depression Screening configuration to be seeded into the database, so that the measure is available immediately after installation or migration.

#### Acceptance Criteria

1. WHEN the database seed runs, THEN it SHALL create a QualityMeasure record with code "Depression Screening", label "Depression Screening", linked to the "Screening" RequestType, with `allowDuplicates = false`.
2. WHEN the database seed runs, THEN it SHALL create 7 MeasureStatus records for "Depression Screening" with the following configuration:

| sortOrder | code | label | datePrompt | baseDueDays |
|-----------|------|-------|------------|-------------|
| 1 | Not Addressed | Not Addressed | null | null |
| 2 | Called to schedule | Called to schedule | Date Called | 7 |
| 3 | Visit scheduled | Visit scheduled | Date Scheduled | 1 |
| 4 | Screening complete | Screening complete | Date Completed | null |
| 5 | Screening unnecessary | Screening unnecessary | Date Determined | null |
| 6 | Patient declined | Patient declined | Date Declined | null |
| 7 | No longer applicable | No longer applicable | Date Determined | null |

3. WHEN the database seed runs, THEN it SHALL use upsert operations so that re-running the seed does not create duplicate records.

### REQ-DS-7: Sample Patient Data

**User Story:** As a developer testing the system, I want sample patients with Depression Screening data in various statuses, so that I can verify all colors, timers, and edge cases without manual data entry.

#### Acceptance Criteria

1. WHEN the database seed runs on a fresh database (no existing patients), THEN it SHALL create sample patients with Depression Screening measures covering at minimum these statuses: Not Addressed (white), Called to schedule (blue), Visit scheduled (yellow), Screening complete (green), Screening unnecessary (gray), Patient declined (purple), and one overdue scenario (red -- e.g., Called to schedule with statusDate more than 7 days ago).
2. WHEN the database seed runs on a database with existing patients, THEN it SHALL skip sample data creation (existing behavior preserved).
3. WHEN sample data is created, THEN patients SHALL be assigned to dev physicians via the existing round-robin assignment logic.

### REQ-DS-8: Default Date Prompt Fallback

**User Story:** As a system operator, I want Depression Screening date prompts to be available even before the database seed runs, so that the UI displays correct labels during development or partial setup.

#### Acceptance Criteria

1. WHEN the `getDefaultDatePrompt()` function is called with "Called to schedule", THEN it SHALL return "Date Called".
2. WHEN the `getDefaultDatePrompt()` function is called with "Visit scheduled", THEN it SHALL return "Date Scheduled".
3. WHEN the `getDefaultDatePrompt()` function is called with "Screening complete", THEN it SHALL return "Date Completed".
4. IF `getDefaultDatePrompt()` already handles "Patient declined", "Screening unnecessary", and "No longer applicable" via existing entries, THEN no duplicate entries SHALL be added for those statuses.

### REQ-DS-9: Status Filter Bar Integration

**User Story:** As a user filtering the patient grid by color, I want Depression Screening rows to be correctly counted in the status filter bar totals, so that color-based filtering includes all measure types.

#### Acceptance Criteria

1. WHEN the status filter bar calculates row counts per color, THEN Depression Screening rows SHALL be included in the correct color bucket based on their Measure Status.
2. WHEN a user clicks the "Blue" filter pill, THEN all Depression Screening rows with "Called to schedule" status SHALL be visible.
3. WHEN a user clicks the "Yellow" filter pill, THEN all Depression Screening rows with "Visit scheduled" status SHALL be visible.
4. WHEN a user clicks the "Green" filter pill, THEN all Depression Screening rows with "Screening complete" status SHALL be visible.

### REQ-DS-10: Cascading Dropdown Integrity

**User Story:** As a user editing patient data, I want the standard cascading clear behavior to work correctly for Depression Screening, so that changing upstream fields never leaves invalid downstream data.

#### Acceptance Criteria

1. WHEN a user changes the Request Type away from "Screening" on a row with Depression Screening data, THEN Quality Measure, Measure Status, Status Date, Tracking fields, Due Date, and Time Interval SHALL be cleared.
2. WHEN a user changes the Quality Measure away from "Depression Screening", THEN Measure Status, Status Date, Tracking fields, Due Date, and Time Interval SHALL be cleared.
3. WHEN a user changes the Measure Status within Depression Screening, THEN Status Date, Tracking fields, Due Date, and Time Interval SHALL be cleared.
4. WHEN any cascading clear occurs on a Depression Screening row, THEN the Notes field SHALL be preserved.

## Non-Functional Requirements

### Performance

- NFR-1: Adding Depression Screening SHALL NOT measurably impact grid load time. The feature adds 7 status entries to the existing status color arrays and one entry to the dropdown config; these are O(1) lookups in the existing architecture.
- NFR-2: The database seed for Depression Screening configuration (1 QualityMeasure + 7 MeasureStatus records) SHALL complete in under 2 seconds as part of the overall seed process.

### Security

- NFR-3: Depression Screening data SHALL follow the same role-based access control as all other quality measures: physicians see only their own patients, staff see only assigned physicians' patients, admins see all patients.
- NFR-4: Depression Screening status values SHALL be validated through the same cascading dropdown configuration that prevents arbitrary status injection.

### Reliability

- NFR-5: The database seed SHALL use upsert operations for all Depression Screening records, making the seed idempotent and safe to re-run.
- NFR-6: If the Depression Screening QualityMeasure or MeasureStatus records are missing from the database (e.g., seed not yet run), the system SHALL gracefully fall back: the dropdown will not show Depression Screening as an option, but the rest of the application SHALL continue to function.

### Usability

- NFR-7: Depression Screening status labels SHALL use plain language consistent with the existing measure naming conventions (e.g., "Called to schedule" matches "Patient called to schedule AWV" pattern; "Screening complete" matches "Screening completed" pattern for other screening measures).
- NFR-8: The "Screening" request type Quality Measure dropdown SHALL display all 4 screening options in alphabetical order: Breast Cancer Screening, Cervical Cancer Screening, Colon Cancer Screening, Depression Screening.

## Integration Requirements

- INT-1: Depression Screening integrates with the existing `REQUEST_TYPE_TO_QUALITY_MEASURE` mapping in `frontend/src/config/dropdownConfig.ts`. No new mapping structures are needed.
- INT-2: Depression Screening integrates with the existing `QUALITY_MEASURE_TO_STATUS` mapping in `frontend/src/config/dropdownConfig.ts`.
- INT-3: New status strings ("Called to schedule", "Visit scheduled", "Screening complete") must be added to the appropriate color arrays in `frontend/src/config/statusColors.ts` (BLUE_STATUSES, YELLOW_STATUSES, GREEN_STATUSES respectively). "Patient declined" and "Screening unnecessary" and "No longer applicable" are already handled by existing entries in PURPLE_STATUSES and GRAY_STATUSES.
- INT-4: New date prompts for "Called to schedule" and "Visit scheduled" must be added to `getDefaultDatePrompt()` in `backend/src/services/statusDatePromptResolver.ts`. "Screening complete" can reuse the pattern of existing "Date Completed" entries.
- INT-5: The `backend/prisma/seed.ts` file must be updated to create the QualityMeasure and MeasureStatus records, and add sample patient data.
- INT-6: No Prisma schema changes are required. The existing `QualityMeasure`, `MeasureStatus`, and `PatientMeasure` models support this feature as-is.
- INT-7: No import mapping changes are required unless Depression Screening data is imported via Hill Healthcare or Sutter systems (out of scope for this feature).

## Assumptions and Constraints

- ASM-1: Depression Screening does not require any Tracking #1 dropdown options. The statuses are self-contained and do not have sub-selections (unlike Colon Cancer with test type or Hypertension with call intervals).
- ASM-2: Depression Screening does not allow duplicate measures per patient (`allowDuplicates = false`), consistent with other screening measures.
- ASM-3: The "Visit scheduled" status uses `baseDueDays = 1`, meaning the due date is 1 day after the status date. This represents "1 day after the scheduled visit date" -- the user enters the scheduled visit date as the Status Date, and the system flags it as overdue if the visit has not been completed by the day after.
- ASM-4: The "Screening complete" status has `baseDueDays = 365` for annual rescreening, consistent with other completed green statuses (e.g., AWV completed). When the annual due date passes, the row turns red to indicate rescreening is needed.
- ASM-5: Import from Hill Healthcare or Sutter systems for Depression Screening data is out of scope and will be addressed in a separate feature if needed.
- ASM-6: The status label "Called to schedule" is a new, unique string that does not conflict with existing status strings. Other screening measures use "Screening discussed" or "Patient contacted for screening" for their initial outreach step. This is intentional -- Depression Screening has a distinct workflow where the first action is a phone call to schedule a visit rather than an in-office discussion.
- ASM-7: The status label "Screening complete" (without the "d" suffix) is intentionally distinct from "Screening completed" used by Cervical Cancer Screening. Both must be added to GREEN_STATUSES. This follows the handwritten requirement source exactly.

## Edge Cases

- EDGE-1: **Status reuse across measures.** "Patient declined" and "No longer applicable" are shared status labels used by multiple measures. The `statusColors.ts` arrays already include these. No duplication is needed, but tests must verify these statuses continue to work for both existing measures and Depression Screening.
- EDGE-2: **"Screening unnecessary" shared with other screening measures.** Already in GRAY_STATUSES. Depression Screening rows with this status must render gray correctly without any config changes for this status.
- EDGE-3: **"Called to schedule" is a new unique status string.** It must be added to BLUE_STATUSES. It must not be confused with "Patient called to schedule AWV" (which is yellow, not blue). The full string match in the status arrays prevents ambiguity.
- EDGE-4: **"Visit scheduled" is a new unique status string.** It must be added to YELLOW_STATUSES. It must not be confused with "Vaccination scheduled" (which is blue) or "AWV scheduled" (which is blue). The naming deliberately uses "Visit" to differentiate from appointment/scheduling statuses that are blue.
- EDGE-5: **"Screening complete" (no "d") vs. "Screening completed" (with "d").** Both must appear in GREEN_STATUSES as separate entries. Tests must verify both render green independently.
- EDGE-6: **Overdue calculation for "Visit scheduled" with baseDueDays=1.** If a user enters today's date as the Status Date, the due date will be tomorrow. The row will turn red the day after tomorrow if the status has not been updated. This is the intended behavior -- a 1-day grace period after the scheduled visit.
- EDGE-7: **Dropdown sort order.** With 4 screening measures, the alphabetical sort in `getQualityMeasuresForRequestType()` will produce: Breast Cancer Screening, Cervical Cancer Screening, Colon Cancer Screening, Depression Screening. Existing tests that assert exactly 3 screening measures will need to be updated to 4.
- EDGE-8: **Empty database (no seed).** If the seed has not been run, Depression Screening will simply not appear in the Quality Measure dropdown. The `getDefaultDatePrompt()` fallback ensures date prompts still work if a row is manually created with Depression Screening statuses.

## Files Requiring Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/config/dropdownConfig.ts` | Modify | Add "Depression Screening" to `REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']` array; add "Depression Screening" entry to `QUALITY_MEASURE_TO_STATUS` |
| `frontend/src/config/statusColors.ts` | Modify | Add "Called to schedule" to `BLUE_STATUSES`; add "Visit scheduled" to `YELLOW_STATUSES`; add "Screening complete" to `GREEN_STATUSES` |
| `backend/src/services/statusDatePromptResolver.ts` | Modify | Add "Called to schedule", "Visit scheduled", and "Screening complete" entries to `getDefaultDatePrompt()` |
| `backend/prisma/seed.ts` | Modify | Add QualityMeasure upsert for "Depression Screening" under Screening request type; add 7 MeasureStatus upserts; add sample patient data entries |
| `frontend/src/config/dropdownConfig.test.ts` | Modify | Update assertion for Screening count from 3 to 4; add Depression Screening status tests |
