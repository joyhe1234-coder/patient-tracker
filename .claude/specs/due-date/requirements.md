# Feature: Due Date Calculation

## Overview
Due dates auto-calculate based on Status Date plus a rule-defined interval. The interval comes from DueDayRule (tracking-dependent) or MeasureStatus.baseDueDays (default). Time Interval field shows the days between Status Date and Due Date.

## User Stories
- As a user, I want due dates to auto-calculate so I don't have to compute them manually
- As a user, I want tracking-dependent due dates so different test types get appropriate follow-up periods

## Acceptance Criteria
- AC-1: Due Date = Status Date + interval days
- AC-2: Interval from DueDayRule when tracking option matches (e.g., Colonoscopy = 42 days)
- AC-3: Interval from MeasureStatus.baseDueDays as fallback
- AC-4: Time Interval field displays calculated days
- AC-5: Changing Status Date recalculates Due Date
- AC-6: HgbA1c statuses require Tracking #2 selection (no base fallback)
- AC-7: "Screening discussed" uses Tracking #1 month selection for interval
- AC-8: Completed AWV = 365 days (annual renewal)

## UI Workflow
1. Select Measure Status → Status Date prompt appears
2. Enter Status Date → Due Date auto-calculates
3. Time Interval shows days between dates
4. Change tracking option → Due Date recalculates

## Business Rules
- DueDayRule lookup: measureStatus + tracking1 combination
- If no DueDayRule match, use baseDueDays from MeasureStatus
- HgbA1c and BP call-back statuses: no baseDueDays fallback (requires dropdown selection)
- Cervical Cancer "Screening discussed" + "In N Months" → N*30 days

## Edge Cases
- No status date (no due date calculated)
- No tracking option selected for HgbA1c (no due date)
- Status with 0 baseDueDays
- Date at year boundary

## Dependencies
- Cascading Dropdowns (for status and tracking selections)
- Cell Editing (for date input)
- Tracking Fields (for tracking-dependent rules)
