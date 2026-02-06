# Feature: Status Bar

## Overview
A status bar at the bottom of the grid displays the total row count, filtered row count when a filter is active, and connection status.

## User Stories
- As a user, I want to see total row count to know how many patients I'm managing
- As a user, I want to see filtered count to know how many match my current filter

## Acceptance Criteria
- AC-1: Shows "Rows: X" where X is total row count
- AC-2: Shows "Connected" in green when backend is reachable
- AC-3: Shows "Showing X of Y rows" when a filter is active
- AC-4: X = filtered count, Y = total count
- AC-5: Returns to "Rows: X" when filter cleared

## UI Workflow
Default: "Rows: 150 | Connected"
Filtered: "Showing 23 of 150 rows | Connected"

## Business Rules
- Count updates on add/delete operations
- Count updates on filter changes
- Connection status reflects actual backend reachability

## Edge Cases
- Zero rows
- All rows filtered out (Showing 0 of X)
- Connection lost during use

## Dependencies
- Data Loading & Display
- Status Filter Bar
