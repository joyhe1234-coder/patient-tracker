# Feature: Row Status Colors

## Overview
Each row in the patient grid displays a background color based on its Measure Status value. Colors provide visual cues about patient compliance status. Overdue rows (past due date) display red, overriding most other colors. Selection uses outline instead of background override.

## User Stories
- As a user, I want rows color-coded by status so I can quickly identify patient compliance at a glance
- As a user, I want overdue rows highlighted in red so I can prioritize urgent follow-ups
- As a user, I want row selection to not hide the status color so I maintain context

## Acceptance Criteria
- AC-1: Rows display colors matching their Measure Status category:
  - Green (#D4EDDA): AWV completed, Screening test completed, HgbA1c at goal, BP at goal
  - Blue (#CCE5FF): AWV scheduled, Screening test ordered, HgbA1c ordered
  - Yellow (#FFF9E6): Patient called, Screening discussed, Contacted
  - Purple (#E5D9F2): Patient declined, Contraindicated
  - Gray (#E9EBF3): No longer applicable, Screening unnecessary
  - Orange (#FFE8CC): Chronic diagnosis resolved/invalid
  - White (#FFFFFF): Not Addressed (default)
- AC-2: Overdue rows (dueDate < today) display light red (#FFCDD2)
- AC-3: Overdue applies to pending statuses (blue, yellow, white) AND completed statuses (green)
- AC-4: Completed rows turn red when due date passes (indicates annual renewal needed)
- AC-5: Declined/resolved statuses (purple, gray, orange) NEVER turn red
- AC-6: Row selection shows blue outline, does NOT override background color
- AC-7: Color updates in real-time when Measure Status changes
- AC-8: Color priority: duplicate indicator > overdue > status-based

## UI Workflow
1. Grid loads → rows colored by status
2. Edit status → color changes immediately
3. Due date passes → row turns red (if applicable)
4. Select row → blue outline on top of color

## Business Rules
- Overdue = dueDate exists AND dueDate < today AND status is NOT terminal (declined/resolved/N-A)
- Completed overdue = green status + dueDate passed (renewal needed)
- Duplicate indicator (orange stripe) takes highest priority

## Edge Cases
- Row with no status (white default)
- Row with no due date (never overdue)
- Status change from overdue to completed (color changes green, may stay red if due date passed)
- Multiple status changes in quick succession

## Dependencies
- Measure Status values from cascading dropdowns
- Due Date calculation
- Duplicate Detection (for priority)
