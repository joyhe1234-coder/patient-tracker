# Feature: Time Interval

## Overview
The Time Interval (Days) column shows the number of days between Status Date and Due Date. It can be manually edited to override the auto-calculated interval, which recalculates the Due Date accordingly.

## User Stories
- As a user, I want to see the time interval so I know how many days until follow-up
- As a user, I want to override the interval to customize follow-up timing

## Acceptance Criteria
- AC-1: Time Interval displays calculated days (dueDate - statusDate)
- AC-2: Time Interval editable for statuses with fixed defaults (baseDueDays)
- AC-3: Time Interval editable for statuses with test type dropdowns (Mammogram, Colonoscopy, etc.)
- AC-4: Manual edit recalculates Due Date = Status Date + new interval
- AC-5: Override value saved to database
- AC-6: NOT editable for 6 time period dropdown statuses:
  - Screening discussed (In 1-11 Months)
  - HgbA1c ordered/at goal/NOT at goal (1-12 months)
  - Scheduled call back - BP at/not at goal (Call every 1-8 wks)
- AC-7: Default interval comes from DueDayRule or baseDueDays

## UI Workflow
1. Status set → Time Interval auto-calculates
2. Click Time Interval cell → editable or not based on status
3. Edit value → Due Date recalculates → saved

## Business Rules
- 6 specific statuses have time interval controlled by dropdown (not directly editable)
- All other statuses allow manual override
- Override persists and is used for Due Date calculation

## Edge Cases
- Edit interval to 0 (due date = status date)
- Edit interval to very large number
- Edit interval when no status date exists

## Dependencies
- Due Date Calculation
- Tracking Fields (dropdown statuses affect editability)
