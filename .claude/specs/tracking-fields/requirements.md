# Feature: Tracking Fields

## Overview
Three tracking columns (Tracking #1, #2, #3) provide context-dependent input based on the selected Measure Status. Fields can be dropdowns, free text with prompts, or disabled (N/A) depending on the clinical context.

## User Stories
- As a user, I want tracking fields to show relevant options for my selected status
- As a user, I want to enter clinical values (HgbA1c, BP readings) in tracking fields
- As a user, I want N/A indicator when tracking doesn't apply to the current status

## Acceptance Criteria
- AC-1: Tracking #1 shows dropdown for statuses with predefined options (e.g., Colonoscopy, Sigmoidoscopy, Cologuard, FOBT for colon cancer screening ordered)
- AC-2: Tracking #1 shows "N/A" (italic, diagonal stripe overlay) for statuses without tracking options
- AC-3: N/A cells are NOT editable
- AC-4: Tracking #1 shows free text input with "HgbA1c value" prompt for HgbA1c statuses
- AC-5: Tracking #2 shows month dropdown (1-12 months) with "Testing interval" prompt for HgbA1c
- AC-6: Tracking #2 shows free text with "BP reading" prompt for Hypertension call back statuses
- AC-7: Cervical Cancer "Screening discussed" Tracking #1 shows "In 1 Month" through "In 11 Months"
- AC-8: Selecting month option sets due date (statusDate + N*30 days)
- AC-9: Chronic Diagnosis "resolved" Tracking #1 shows attestation options
- AC-10: Tracking #3 is always editable free text

## UI Workflow
1. Set Measure Status → Tracking fields update type (dropdown/text/N-A)
2. Click Tracking #1 → see appropriate input for status
3. Select/enter value → Due Date may recalculate

## Business Rules
- Tracking field type determined by measureStatus + qualityMeasure combination
- N/A = no tracking options AND not a free text field
- Free text prompts: "HgbA1c value", "BP reading", "Testing interval"
- Tracking selections can affect Due Date calculation

## Edge Cases
- Switch between statuses with different tracking types
- Enter free text then switch to dropdown status
- Tracking value entered then status cleared (cascade clear)

## Dependencies
- Cascading Dropdowns (status determines tracking behavior)
- Due Date Calculation (tracking affects due date)
