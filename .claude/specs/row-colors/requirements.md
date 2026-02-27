# Feature: Row Status Colors

## Overview
Each row in the patient grid displays a background color based on its Measure Status value and additional conditions (overdue, attestation status). Colors provide visual cues about patient compliance status. Overdue rows (past due date) display red, overriding most other colors. Selection uses outline instead of background override.

**Detailed reference:** `.claude/ROW_COLOR_LOGIC.md` — Complete truth tables, code locations, cascading logic

## User Stories
- As a user, I want rows color-coded by status so I can quickly identify patient compliance at a glance
- As a user, I want overdue rows highlighted in red so I can prioritize urgent follow-ups
- As a user, I want row selection to not hide the status color so I maintain context
- As a user, I want Chronic DX rows with "Attestation sent" to turn green so I know attestation is complete

## Acceptance Criteria

### Status → Color Mapping
- AC-1: Rows display colors matching their Measure Status category:
  - **White** (#FFFFFF): `Not Addressed`, null/empty, any unrecognized status
  - **Yellow** (#FFF9E6): `Patient called to schedule AWV`, `Diabetic eye exam discussed`, `Screening discussed`, `Patient contacted for screening`, `Vaccination discussed`
  - **Blue** (#CCE5FF): `AWV scheduled`, `Will call later to schedule`, `Diabetic eye exam scheduled/referral`, `Obtaining outside records`, `Screening test/appt ordered`, `Test ordered`, `Urine microalbumin ordered`, `Appointment scheduled`, `Scheduled call back - BP not at goal`, `Scheduled call back - BP at goal`, `ACE/ARB prescribed`, `Vaccination scheduled`, `HgbA1c ordered`, `HgbA1c NOT at goal`, `Lab ordered`
  - **Green** (#D4EDDA): `AWV completed`, `Diabetic eye exam completed`, `Screening test/completed`, `GC/Chlamydia screening completed`, `Urine microalbumin completed`, `Blood pressure at goal`, `Patient on ACE/ARB`, `Vaccination completed`, `HgbA1c at goal`, `Lab completed`, `Chronic diagnosis confirmed`
  - **Purple** (#E5D9F2): `Patient declined AWV`, `Patient declined`, `Patient declined screening`, `Declined BP control`, `Contraindicated`
  - **Orange** (#FFE8CC): `Chronic diagnosis resolved`, `Chronic diagnosis invalid` (when Tracking #1 is NOT "Attestation sent")
  - **Gray** (#E9EBF3): `No longer applicable`, `Screening unnecessary`

### Chronic DX Attestation Color Cascade
- AC-9: `Chronic diagnosis resolved` or `Chronic diagnosis invalid` with Tracking #1 = `Attestation sent` → **GREEN** (always, regardless of due date)
- AC-10: `Chronic diagnosis resolved` or `Chronic diagnosis invalid` with Tracking #1 = `Attestation not sent` or null → **ORANGE** (if not overdue)
- AC-11: `Chronic diagnosis resolved` or `Chronic diagnosis invalid` with Tracking #1 = `Attestation not sent` or null AND `dueDate < today` → **RED** (overdue)

### Overdue (Red) Logic
- AC-2: Overdue rows (`dueDate < today`) display light red (#FFCDD2) with CSS class `row-status-overdue`
- AC-3: Overdue **applies to**: White, Yellow, Blue, Green statuses
- AC-4: Completed (green) rows turn red when due date passes (indicates annual renewal needed)
- AC-5: Overdue **NEVER applies to**: Purple (declined), Gray (N/A)
- AC-12: Overdue **conditionally applies to** Orange: only when Tracking #1 is NOT "Attestation sent" (see AC-11)

### Selection and Priority
- AC-6: Row selection shows blue outline, does NOT override background color
- AC-7: Color updates in real-time when Measure Status changes
- AC-8: Color priority: duplicate indicator (additive) > overdue (override) > status-based color

### Duplicate Indicator
- AC-13: Duplicate rows (`isDuplicate === true`) show 4px solid orange left border (#F97316)
- AC-14: Duplicate indicator is **additive** — combines with any background color

### Depression Screening Status → Color Mapping
- AC-15: `Not Addressed` → **White** (#FFFFFF) — default/unstarted
- AC-16: `Called to schedule` → **Blue** (#CCE5FF) — in progress, outreach made
- AC-17: `Visit scheduled` → **Yellow** (#FFF9E6) — appointment pending
- AC-18: `Screening complete` → **Green** (#D4EDDA) — completed, no due date
- AC-19: `Screening unnecessary` → **Gray** (#E9EBF3) — not applicable
- AC-20: `Patient declined` → **Purple** (#E5D9F2) — patient refused
- AC-21: `No longer applicable` → **Gray** (#E9EBF3) — no longer relevant
- AC-22: Overdue applies to `Called to schedule` (blue) and `Visit scheduled` (yellow) only — turns **Red** (#FFCDD2) when `dueDate < today`
- AC-23: `Screening complete` has no due date → never overdue
- AC-24: Purple/Gray Depression Screening statuses → never overdue (standard exclusion)

## Hypertension "Scheduled Call Back" Statuses
- `Scheduled call back - BP not at goal` → **BLUE** (in progress, needs follow-up call)
- `Scheduled call back - BP at goal` → **BLUE** (in progress, needs confirmation call)
- Both turn **RED** if `dueDate < today` (standard overdue behavior for blue statuses)

## UI Workflow
1. Grid loads → rows colored by status
2. Edit status → color changes immediately; downstream fields cleared
3. Set/change Tracking #1 on Chronic DX → color may change (GREEN if attestation sent)
4. Due date passes → row turns red (if applicable per overdue rules)
5. Select row → blue outline on top of color

## Business Rules
- Overdue = `dueDate` exists AND `dueDate < today` AND status NOT in {purple, gray} AND NOT (Chronic DX + "Attestation sent")
- Completed overdue = green status + dueDate passed (renewal needed)
- Chronic DX attestation = `measureStatus` in {resolved, invalid} AND `tracking1` = "Attestation sent" → GREEN
- Duplicate indicator (orange stripe) is additive, not exclusive

## Due Date Calculation
- `dueDate = statusDate + timeIntervalDays`
- `timeIntervalDays` comes from: special tracking values → DueDayRule lookup → baseDueDays fallback
- Chronic DX `Attestation not sent` has DueDayRule: 14 days
- Chronic DX `Attestation sent` has NO DueDayRule (no due date → never overdue)
- User can manually override `timeIntervalDays` except for TIME_PERIOD_DROPDOWN_STATUSES

## Edge Cases
- Row with no status → white default
- Row with no due date → never overdue
- Chronic DX with no Tracking #1 selected yet → orange (same as "Attestation not sent")
- Status change clears downstream fields → dueDate becomes null → overdue removed
- Green row with past dueDate → turns red (annual renewal overdue)
- Multiple status changes in quick succession → each triggers cascade

## Dependencies
- Measure Status values from cascading dropdowns
- Tracking #1 values from `dropdownConfig.ts` (`STATUS_TO_TRACKING1`)
- Due Date calculation (`dueDateCalculator.ts`, `DueDayRule` database)
- Duplicate Detection (for priority)

## Code Locations
- Status arrays + `rowClassRules`: `PatientGrid.tsx:838-947`
- `getRowStatusColor()` for filter counting: `StatusFilterBar.tsx:146-187`
- CSS classes: `index.css:24-33`
- Backend cascading + due date: `data.routes.ts:386-442`
