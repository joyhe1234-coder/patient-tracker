# Test Gap Analysis Report: Area 3 -- Cell Editing & Conflict Resolution

**Date:** 2026-03-02
**Analyst:** Claude Opus 4.6
**Scope:** All cell editing, date handling, dropdown editors, save lifecycle, version conflict detection, conflict resolution modal, real-time parallel editing, cascading field logic, and related edge cases.

---

## Summary

Requirement Area 3 covers two major spec areas: **Cell Editing** (`.claude/specs/cell-editing/`) and **Parallel Editing** (`.claude/specs/parallel-editing/`). Together they define how users create and modify data in the AG Grid, how changes are saved to the backend, and how concurrent edits by multiple users are detected and resolved.

### Test Inventory

| Framework | File | Test Count | Area |
|-----------|------|-----------|------|
| **Vitest** | `AutoOpenSelectEditor.test.tsx` | 16 | Dropdown editor component |
| **Vitest** | `DateCellEditor.test.tsx` | 8 | Date editor component |
| **Vitest** | `StatusDateRenderer.test.tsx` | 12 | Status date renderer + Today button |
| **Vitest** | `PatientGrid.test.tsx` | ~50 | Grid config, column defs, row class rules, socket integration, conflict modal wiring |
| **Vitest** | `ConflictModal.test.tsx` | 12 | Conflict resolution modal component |
| **Vitest** | `useGridCellUpdate.test.ts` | 13 | Cell value change hook (save, 409, 404, revert) |
| **Vitest** | `cascadingFields.test.ts` | 14 | Cascading field clear logic |
| **Jest** | `versionCheck.test.ts` | 11 | Backend optimistic concurrency service |
| **Jest** | `data.routes.version.test.ts` | 9 | Backend PUT endpoint version check integration |
| **Cypress** | `cell-editing.cy.ts` | 14 | Row selection, text editing, date editing, save indicator |
| **Cypress** | `cell-editing-conflict.cy.ts` | 8 | 409 conflict modal lifecycle (Keep Mine/Theirs/Cancel) |
| **Cypress** | `hover-reveal-dropdown.cy.ts` | 10 | Hover-reveal dropdown arrow, single-click open |
| **Cypress** | `date-prepopulate.cy.ts` | 9 | Today button, manual date entry, due date recalculation |
| **Cypress** | `grid-editing-roles.cy.ts` | ~6 | Role-based editing (Admin/Physician/Staff) |
| **Playwright** | `parallel-editing-conflict.spec.ts` | 3 | Two-browser conflict resolution |
| **Playwright** | `parallel-editing-updates.spec.ts` | 3 | Real-time updates (add/edit/delete broadcast) |
| **Total** | | **~198** | |

### Overall Coverage Rating: **75%** (Good coverage, notable gaps remain)

### Top Gaps (Ordered by Priority)

| # | Gap | Priority | Impact |
|---|-----|----------|--------|
| 1 | Tab navigation between cells during editing | HIGH | Core data entry UX |
| 2 | Escape key to undo/cancel mid-edit | MEDIUM | Data entry UX |
| 3 | Rapid consecutive edits / debounce | MEDIUM | Data integrity |
| 4 | Network failure during save | MEDIUM | Error resilience |
| 5 | Special characters / XSS in text fields | MEDIUM | Security |
| 6 | Large text handling in Notes field | LOW | Edge case |
| 7 | Edit during loading state | LOW | Edge case |
| 8 | Time Interval manual override validation | LOW | Edge case |
| 9 | Presence awareness (who is online) | LOW | Parallel editing UX |
| 10 | Socket reconnection + data refresh | LOW | Reliability |

---

## Detailed Use Case Analysis

### UC-3.1: Text Cell Editing (Notes)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Double-click opens edit mode | -- | PatientGrid (config: singleClickEdit=false) | cell-editing.cy.ts | -- | No |
| Type text, save on click-away | -- | -- | cell-editing.cy.ts (save text on click elsewhere) | -- | No |
| Type text, save on Enter | -- | -- | cell-editing.cy.ts (save text on Enter) | -- | No |
| Type text, save on Tab | -- | -- | -- | -- | **YES** |
| Edited text persists after exit | -- | -- | cell-editing.cy.ts (persist saved text) | -- | No |
| No save if value unchanged | -- | useGridCellUpdate (no-op when same value) | -- | -- | No |
| Cancel editing with Escape | -- | -- | date-prepopulate.cy.ts (Escape cancels manual date editing) | -- | Partial (only date cell tested) |

**Gaps:**
- **Tab key saves and moves to next cell:** Not tested anywhere. The grid config has `stopEditingWhenCellsLoseFocus=true`, but Tab navigation between cells is not verified.
- **Escape on text cells:** Only tested for the date editor; not tested for Notes or Member Name text editing.

---

### UC-3.2: Dropdown Cell Editing (AutoOpenSelectEditor)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Renders all options | -- | AutoOpenSelectEditor (16 tests) | hover-reveal-dropdown.cy.ts | -- | No |
| Shows (clear) option | -- | AutoOpenSelectEditor | -- | -- | No |
| Highlights current value on mount | -- | AutoOpenSelectEditor | -- | -- | No |
| Checkmark on current value | -- | AutoOpenSelectEditor | -- | -- | No |
| ArrowDown/ArrowUp navigation | -- | AutoOpenSelectEditor (4 tests) | -- | -- | No |
| Enter selects highlighted option | -- | AutoOpenSelectEditor | -- | -- | No |
| Tab selects highlighted option | -- | AutoOpenSelectEditor | -- | -- | No |
| Escape cancels without saving | -- | AutoOpenSelectEditor | -- | -- | No |
| Type-ahead (press key to jump) | -- | AutoOpenSelectEditor | -- | -- | No |
| Mouse click selects option | -- | AutoOpenSelectEditor | -- | -- | No |
| Mouse hover highlights option | -- | AutoOpenSelectEditor | -- | -- | No |
| Focus on mount | -- | AutoOpenSelectEditor | -- | -- | No |
| Unknown value defaults to index 0 | -- | AutoOpenSelectEditor | -- | -- | No |
| Null value handled | -- | AutoOpenSelectEditor | -- | -- | No |
| Single-click opens dropdown cell | -- | PatientGrid (isDropdownCell logic) | hover-reveal-dropdown.cy.ts (3 tests) | -- | No |
| Popup position correct | -- | AutoOpenSelectEditor (isPopup=true) | hover-reveal-dropdown.cy.ts | -- | No |
| Scrollable list | -- | AutoOpenSelectEditor (scrollIntoView mock) | -- | -- | No |

**Gaps:** None significant. Dropdown editing is very well covered.

---

### UC-3.3: Hover-Reveal Dropdown Arrow

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Arrow element exists on dropdown cells | -- | -- | hover-reveal-dropdown.cy.ts (3 tests) | -- | No |
| Arrow hidden by default (no hover) | -- | -- | hover-reveal-dropdown.cy.ts | -- | No |
| Arrow visible on hover (CSS :hover) | -- | -- | hover-reveal-dropdown.cy.ts (partial - CSS hover not testable in Cypress) | -- | Partial |
| No arrow on text cells (Notes) | -- | -- | hover-reveal-dropdown.cy.ts | -- | No |
| No arrow on disabled cells (N/A) | -- | -- | hover-reveal-dropdown.cy.ts | -- | No |
| Arrow styling (color, border-radius) | -- | -- | hover-reveal-dropdown.cy.ts (2 tests) | -- | No |

**Gaps:**
- **Arrow visibility on actual hover:** CSS `:hover` cannot be triggered by Cypress's `trigger('mouseover')`. This is acknowledged in the test comments. Only MCP Playwright visual review can truly verify this.

---

### UC-3.4: Date Cell Editing (DateCellEditor)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Renders text input | -- | DateCellEditor (8 tests) | cell-editing.cy.ts | -- | No |
| Shows existing date value | -- | DateCellEditor | -- | -- | No |
| Empty/null value handled | -- | DateCellEditor (2 tests) | cell-editing.cy.ts (clear date) | -- | No |
| Accessibility (aria-label) | -- | DateCellEditor | -- | -- | No |
| Focus on mount | -- | DateCellEditor | -- | -- | No |
| AG Grid interface (getValue, isPopup=false) | -- | DateCellEditor (3 tests) | -- | -- | No |
| Accept MM/DD/YYYY format | -- | -- | cell-editing.cy.ts | -- | No |
| Accept M/D/YY format | -- | -- | cell-editing.cy.ts | -- | No |
| Accept YYYY-MM-DD format | -- | -- | cell-editing.cy.ts | -- | No |
| Accept M.D.YYYY format | -- | -- | cell-editing.cy.ts | -- | No |
| Normalize to M/D/YYYY display | -- | -- | cell-editing.cy.ts | -- | No |
| Invalid text shows alert + revert | -- | -- | cell-editing.cy.ts (2 tests) | -- | No |
| Invalid numbers (13/45/2025) show alert + revert | -- | -- | cell-editing.cy.ts | -- | No |
| Clear to empty saves null | -- | -- | cell-editing.cy.ts | -- | No |

**Gaps:** None. Date editing is well covered between Vitest component tests and Cypress E2E.

---

### UC-3.5: StatusDateRenderer + "Today" Button

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Filled cell shows formatted date | -- | StatusDateRenderer (3 tests) | -- | -- | No |
| No Today button on filled cells | -- | StatusDateRenderer | date-prepopulate.cy.ts | -- | No |
| Empty cell shows prompt text | -- | StatusDateRenderer (2 tests) | date-prepopulate.cy.ts | -- | No |
| Today button visible on hover | -- | StatusDateRenderer | date-prepopulate.cy.ts | -- | No |
| Today click stamps today's date | -- | StatusDateRenderer (2 tests) | date-prepopulate.cy.ts | -- | No |
| Today click triggers save pipeline | -- | -- | date-prepopulate.cy.ts | -- | No |
| Prompt class removed after stamp | -- | -- | date-prepopulate.cy.ts | -- | No |
| Double-click opens text editor | -- | -- | date-prepopulate.cy.ts | -- | No |
| Custom date saved on Enter | -- | -- | date-prepopulate.cy.ts | -- | No |
| Escape cancels manual entry | -- | -- | date-prepopulate.cy.ts | -- | No |
| Different prompt texts (Date Ordered, Date Completed, Date Declined) | -- | StatusDateRenderer (2 tests) | -- | -- | No |
| Empty cell without prompt renders nothing | -- | StatusDateRenderer | -- | -- | No |
| Due date recalculation after Today click | -- | -- | date-prepopulate.cy.ts | -- | No |

**Gaps:** None. StatusDate is comprehensively covered.

---

### UC-3.6: Save Indicator Lifecycle

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| "Saving..." appears during API call | -- | useGridCellUpdate (onSaveStatusChange='saving') | cell-editing.cy.ts (regex Sav(ing|ed)) | -- | No |
| "Saved" appears on success | -- | useGridCellUpdate (onSaveStatusChange='saved') | cell-editing.cy.ts | -- | No |
| Indicator disappears after 2 seconds | -- | useGridCellUpdate (timer test) | cell-editing.cy.ts | -- | No |
| Error status on save failure | -- | useGridCellUpdate (onSaveStatusChange='error') | -- | -- | No |
| Error status resets after 3 seconds | -- | useGridCellUpdate | -- | -- | No |

**Gaps:** None.

---

### UC-3.7: Cascading Field Clears

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| requestType change clears all downstream | -- | cascadingFields (6 tests) + useGridCellUpdate | -- | -- | No |
| requestType AWV auto-fills qualityMeasure | -- | cascadingFields | -- | -- | No |
| requestType Chronic DX auto-fills QM | -- | cascadingFields | -- | -- | No |
| requestType Quality/Screening clears QM | -- | cascadingFields (2 tests) | -- | -- | No |
| qualityMeasure change clears downstream | -- | cascadingFields (3 tests) | -- | -- | No |
| measureStatus change clears downstream | -- | cascadingFields (3 tests) | -- | -- | No |
| Non-cascading fields return empty payload | -- | cascadingFields (4 tests) | -- | -- | No |
| Cascade includes dueDate + timeIntervalDays | -- | cascadingFields | -- | -- | No |
| Notes never cleared by cascade | -- | cascadingFields (notes returns empty) | -- | -- | No |
| isCascadingUpdateRef prevents redundant API calls | -- | useGridCellUpdate | -- | -- | No |

**Gaps:** None. Cascading logic is comprehensively unit-tested.

---

### UC-3.8: API PUT with Version Check (Backend)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| PUT without expectedVersion (backward compat) | data.routes.version.test.ts | -- | -- | -- | No |
| PUT with matching expectedVersion (no conflict) | data.routes.version.test.ts | -- | -- | -- | No |
| PUT with mismatched version + overlapping fields = 409 | data.routes.version.test.ts | -- | -- | -- | No |
| PUT with mismatched version + non-overlapping fields = 200 (auto-merge) | data.routes.version.test.ts | -- | -- | -- | No |
| PUT with forceOverwrite=true skips check | data.routes.version.test.ts | -- | -- | -- | No |
| Audit log includes conflictOverride flag | data.routes.version.test.ts | -- | -- | -- | No |
| Audit log includes field-level changes | data.routes.version.test.ts | -- | -- | -- | No |
| 409 does not create audit log entry | data.routes.version.test.ts | -- | -- | -- | No |

**Gaps:** None. Backend version check is well tested.

---

### UC-3.9: Version Check Service (versionCheck.ts)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Matching timestamps = no conflict | versionCheck.test.ts | -- | -- | -- | No |
| Mismatched timestamps + overlapping fields = conflict | versionCheck.test.ts | -- | -- | -- | No |
| Mismatched timestamps + non-overlapping fields = auto-merge | versionCheck.test.ts | -- | -- | -- | No |
| No audit log field info = assume full conflict | versionCheck.test.ts | -- | -- | -- | No |
| Deleted row = no conflict | versionCheck.test.ts | -- | -- | -- | No |
| changedBy from displayName | versionCheck.test.ts | -- | -- | -- | No |
| changedBy fallback to email | versionCheck.test.ts | -- | -- | -- | No |
| Multiple overlapping fields | versionCheck.test.ts | -- | -- | -- | No |
| Audit log query failure = graceful degradation | versionCheck.test.ts | -- | -- | -- | No |
| toGridRowPayload correctness | versionCheck.test.ts (5 tests) | -- | -- | -- | No |

**Gaps:** None. This service is thoroughly tested.

---

### UC-3.10: Conflict Resolution Modal (ConflictModal)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Hidden when isOpen=false | -- | ConflictModal.test.tsx | -- | -- | No |
| Visible when isOpen=true | -- | ConflictModal.test.tsx | cell-editing-conflict.cy.ts | -- | No |
| Displays patient name | -- | ConflictModal.test.tsx | -- | -- | No |
| Displays changedBy user name | -- | ConflictModal.test.tsx | cell-editing-conflict.cy.ts | -- | No |
| Displays field name | -- | ConflictModal.test.tsx | -- | -- | No |
| Shows Original / Their Version / Your Version | -- | ConflictModal.test.tsx | -- | -- | No |
| Displays actual conflict values | -- | ConflictModal.test.tsx | -- | -- | No |
| Shows "(empty)" for null values | -- | ConflictModal.test.tsx | -- | -- | No |
| Multiple conflict fields displayed | -- | ConflictModal.test.tsx | cell-editing-conflict.cy.ts | -- | No |
| "Keep Mine" callback fires | -- | ConflictModal.test.tsx | -- | -- | No |
| "Keep Theirs" callback fires | -- | ConflictModal.test.tsx | -- | -- | No |
| "Cancel" callback fires | -- | ConflictModal.test.tsx | -- | -- | No |
| Backdrop click triggers Cancel | -- | ConflictModal.test.tsx | -- | -- | No |
| All three buttons rendered | -- | ConflictModal.test.tsx | -- | -- | No |

**Gaps:** None. Modal component tests are comprehensive.

---

### UC-3.11: Conflict Resolution E2E Lifecycle (Full Flow)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| 409 triggers conflict modal display | -- | -- | cell-editing-conflict.cy.ts | parallel-editing-conflict.spec.ts | No |
| Keep Mine sends forceOverwrite PUT | -- | -- | cell-editing-conflict.cy.ts | parallel-editing-conflict.spec.ts | No |
| Keep Mine handles server error | -- | -- | cell-editing-conflict.cy.ts | -- | No |
| Keep Theirs reverts to server value | -- | -- | cell-editing-conflict.cy.ts | parallel-editing-conflict.spec.ts | No |
| Cancel restores server row data | -- | -- | cell-editing-conflict.cy.ts | -- | No |
| Next edit after resolution uses fresh updatedAt | -- | -- | cell-editing-conflict.cy.ts | -- | No |
| Multi-field cascaded conflicts displayed | -- | -- | cell-editing-conflict.cy.ts | -- | No |
| Conflict resolution works as Physician role | -- | -- | cell-editing-conflict.cy.ts | -- | No |

**Gaps:** None. E2E conflict lifecycle is well covered.

---

### UC-3.12: Frontend 409 Handling (useGridCellUpdate hook)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| 409 VERSION_CONFLICT opens conflict modal | -- | useGridCellUpdate.test.ts | -- | -- | No |
| Conflict data populated correctly | -- | useGridCellUpdate.test.ts | -- | -- | No |
| Save status set to 'error' on conflict | -- | useGridCellUpdate.test.ts | -- | -- | No |
| 404 shows toast + removes row | -- | useGridCellUpdate.test.ts | -- | -- | No |
| Generic error shows toast + reverts value | -- | useGridCellUpdate.test.ts | -- | -- | No |
| 409 non-conflict (duplicate) resets requestType | -- | useGridCellUpdate.test.ts | -- | -- | No |
| 409 non-conflict (duplicate) resets qualityMeasure | -- | useGridCellUpdate.test.ts | -- | -- | No |
| isCascadingUpdateRef always reset in finally | -- | useGridCellUpdate.test.ts | -- | -- | No |

**Gaps:** None.

---

### UC-3.13: Real-Time Parallel Editing (Socket.IO)

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| User A edit appears on User B grid | -- | -- | -- | parallel-editing-updates.spec.ts | No |
| User A adds row, User B sees it | -- | -- | -- | parallel-editing-updates.spec.ts | No |
| User A deletes row, User B sees removal | -- | -- | -- | parallel-editing-updates.spec.ts | No |
| Two users edit same cell triggers conflict | -- | -- | -- | parallel-editing-conflict.spec.ts | No |
| Keep Mine resolves with user's value | -- | -- | -- | parallel-editing-conflict.spec.ts | No |
| Keep Theirs reverts to other user's value | -- | -- | -- | parallel-editing-conflict.spec.ts | No |
| Connection status indicator appears | -- | -- | -- | parallel-editing-updates.spec.ts (checks "Connected") | No |
| Presence indicator (others online count) | -- | -- | -- | -- | **YES** |
| Reconnection after brief disconnect | -- | -- | -- | -- | **YES** |
| Full data refresh on reconnection | -- | -- | -- | -- | **YES** |
| Import banner during bulk import | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Presence indicator:** No test verifies the "X others online" count or tooltip.
- **Reconnection flow:** No test simulates network interruption and recovery.
- **Import notification:** No test verifies the "Data import in progress" banner.

---

### UC-3.14: Remote Edit Indicators

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| cell-remote-editing class applied when match | -- | PatientGrid.test.tsx (3 tests) | -- | -- | No |
| class not applied when no match | -- | PatientGrid.test.tsx (2 tests) | -- | -- | No |
| Multiple cells independently indicated on same row | -- | PatientGrid.test.tsx | -- | -- | No |
| useRemoteEditClass hook returns correct class | -- | (tested via PatientGrid) | -- | -- | No |
| Visual appearance of dashed orange border | -- | -- | -- | -- | **YES** |
| Tooltip shows editor's name on hover | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Visual verification of dashed orange border:** No E2E test or visual review confirms the CSS renders correctly.
- **Tooltip with editor's name:** The tooltip attribute setting is not tested.

---

### UC-3.15: Remote Row Update Handling

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Out-of-order protection (older broadcast discarded) | -- | PatientGrid.test.tsx (timestamp logic test) | -- | -- | Partial (logic tested, not integration) |
| Cascading edit conflict detection (cancel edit + toast) | -- | -- | -- | -- | **YES** |
| flashCells animation on remote update | -- | -- | -- | -- | **YES** |
| Row redraw after remote update (row colors update) | -- | -- | -- | -- | **YES** |
| Remote row create deduplication | -- | -- | -- | parallel-editing-updates.spec.ts | No |
| Remote row delete + edit cancellation | -- | -- | -- | parallel-editing-updates.spec.ts | Partial |

**Gaps:**
- **Cascading edit conflict:** When User B is editing a cell and User A changes a parent field that cascades, User B should see a toast and have their edit cancelled. Not tested.
- **Flash animation:** The `flashCells` call is made in code but never verified visually.
- **Row redraw after remote update:** The `redrawRows` call is in code but E2E verification that row colors update is missing.

---

### UC-3.16: Row Selection

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Click shows selection outline (ag-row-selected) | -- | PatientGrid.test.tsx (rowSelection='single') | cell-editing.cy.ts | -- | No |
| Selection changes when clicking different row | -- | -- | cell-editing.cy.ts | -- | No |
| Selection preserves status color | -- | -- | cell-editing.cy.ts | -- | No |
| Status bar unchanged during selection | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Status bar unchanged on selection:** AC-9 from the spec is not tested anywhere.

---

### UC-3.17: Editing by Role

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Admin can edit dropdown columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Admin can edit text columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Physician can edit dropdown columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Physician can edit text columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Staff can edit dropdown columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Staff can edit text columns | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Physician sees only own patients | -- | -- | grid-editing-roles.cy.ts | -- | No |
| Staff sees only assigned physician's patients | -- | -- | grid-editing-roles.cy.ts | -- | No |

**Gaps:** None. Role-based editing is covered.

---

### UC-3.18: Editing Disabled Cells

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| dueDate column is not editable (calculated) | -- | PatientGrid.test.tsx | -- | -- | No |
| tracking1 N/A when no dropdown options | -- | PatientGrid.test.tsx (editable callback) | hover-reveal-dropdown.cy.ts | -- | No |
| tracking2 N/A when not HgbA1c/BP status | -- | PatientGrid.test.tsx | -- | -- | No |
| Time Interval not editable for TIME_PERIOD statuses | -- | -- | -- | -- | **YES** |
| Time Interval not editable when no statusDate | -- | -- | -- | -- | **YES** |
| cell-disabled class applied to N/A cells | -- | PatientGrid.test.tsx (cellClass logic) | hover-reveal-dropdown.cy.ts | -- | No |
| Single-click on disabled cell does nothing | -- | PatientGrid.test.tsx (onCellClicked guard) | -- | -- | Partial |

**Gaps:**
- **Time Interval editability logic:** The `isTimeIntervalEditable` function has complex conditions (requires statusDate, requires timeIntervalDays, excludes TIME_PERIOD statuses) that are not unit tested.
- **No E2E test for Time Interval editing restrictions.**

---

### UC-3.19: Tab Navigation Between Cells

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Tab saves current cell and moves to next | -- | -- | -- | -- | **YES** |
| Shift+Tab saves and moves to previous | -- | -- | -- | -- | **YES** |
| Tab on dropdown selects value and moves | -- | AutoOpenSelectEditor (Tab test) | -- | -- | Partial (unit only) |

**Gaps:**
- **Tab navigation flow:** The full Tab-through-cells workflow is not tested in E2E. Only the AutoOpenSelectEditor unit test verifies Tab selects and calls stopEditing. The actual AG Grid navigation behavior (focus moving to next cell) is not verified.

---

### UC-3.20: Escape Key to Cancel Edit

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Escape on dropdown reverts (cancel) | -- | AutoOpenSelectEditor (Escape test) | -- | -- | Partial (unit only) |
| Escape on date cell reverts | -- | -- | date-prepopulate.cy.ts | -- | No |
| Escape on text cell reverts | -- | -- | -- | -- | **YES** |
| Cell value unchanged after Escape | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Escape on text cells (Notes, Member Name):** Not tested in E2E. Only dropdown and date cells have Escape tested.

---

### UC-3.21: Rapid Consecutive Edits

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Each edit carries correct expectedVersion | -- | PatientGrid.test.tsx (sequential updatedAt logic) | -- | -- | Partial (logic only) |
| Multiple cells edited quickly all save | -- | -- | -- | -- | **YES** |
| No data loss on rapid tab-through editing | -- | -- | -- | -- | **YES** |
| Save indicators appear for each edit | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Full rapid edit E2E:** No test simulates quickly editing 3+ cells in succession and verifying all saves persist after page reload. The spec's EC-1 (Rapid Edits) has no automation.

---

### UC-3.22: Special Characters in Text Fields

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Quotes and apostrophes in Notes | -- | -- | -- | -- | **YES** |
| HTML/script tags in text fields (XSS) | -- | -- | -- | -- | **YES** |
| Unicode characters | -- | -- | -- | -- | **YES** |
| Very long text (1000+ chars) | -- | -- | -- | -- | **YES** |

**Gaps:**
- **No test verifies special character handling in text fields.** The spec's EC-4 and EC-6 are not automated.

---

### UC-3.23: Network Failure During Save

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Network error shows toast + reverts | -- | useGridCellUpdate (generic error test) | -- | -- | Partial (unit only) |
| Save status shows error state | -- | useGridCellUpdate | -- | -- | Partial (unit only) |
| Grid remains interactive after network failure | -- | -- | cell-editing-conflict.cy.ts (Keep Mine 500 error test) | -- | No |
| Retry mechanism after network recovery | -- | -- | -- | -- | **YES** |

**Gaps:**
- **No E2E test simulates a complete network outage during save.** Only the unit test mocks a rejected promise. The Cypress test for "Keep Mine handles server error" tests a 500 response but not a network timeout.
- **No retry mechanism test.**

---

### UC-3.24: Edit During Loading State

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Editing prevented while data is loading | -- | -- | -- | -- | **YES** |
| Loading spinner blocks grid interaction | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Not tested.** It is unclear from the source code whether the grid is actually non-interactive during the initial data load. No test verifies this behavior.

---

### UC-3.25: Member Name Editing

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Double-click opens edit mode | -- | -- | cell-editing.cy.ts | -- | No |
| Edited name displays immediately | -- | -- | cell-editing.cy.ts | -- | No |
| Save persists to backend | -- | -- | cell-editing.cy.ts | -- | No |

**Gaps:** None.

---

### UC-3.26: Time Interval (Days) Editing

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Accepts valid integer 1-1000 | -- | -- | -- | -- | **YES** |
| Rejects empty/null (no clearing) | -- | -- | -- | -- | **YES** |
| Rejects non-numeric input | -- | -- | -- | -- | **YES** |
| Rejects out-of-range values | -- | -- | -- | -- | **YES** |
| Shows alert for invalid input | -- | -- | -- | -- | **YES** |
| Not editable for TIME_PERIOD statuses | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Time Interval validation is completely untested.** The `valueSetter` in PatientGrid.tsx has specific validation logic (parseInt, range 1-1000, alert on invalid) with zero test coverage.

---

### UC-3.27: DOB Column Special Behavior

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| DOB masked as ### in display | -- | PatientGrid.test.tsx (valueFormatter) | -- | -- | No |
| DOB null returns empty string | -- | PatientGrid.test.tsx | -- | -- | No |
| DOB editing with date validation | -- | -- | -- | -- | **YES** |
| Empty DOB shows alert (required field) | -- | -- | -- | -- | **YES** |

**Gaps:**
- **DOB editing flow:** The DOB valueSetter calls `parseAndValidateDate` and has a special "required" check with `alert()`. Neither is tested in E2E.

---

### UC-3.28: Phone Number Formatting

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| 10-digit phone formats as (XXX) XXX-XXXX | -- | -- | -- | -- | **YES** |
| Non-10-digit phone displays as-is | -- | -- | -- | -- | **YES** |
| Null phone returns empty string | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Phone formatting:** The `formatPhone` helper is not unit tested despite being a pure function.

---

### UC-3.29: Sort Freeze During Edit

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Edit on sorted column clears sort | -- | useGridCellUpdate (getColumnState mock) | -- | -- | Partial |
| Frozen row order maintained via postSortRows | -- | PatientGrid (postSortRows callback) | -- | -- | Partial |
| Row does not jump position after edit | -- | -- | -- | -- | **YES** |

**Gaps:**
- **E2E verification that editing a sorted column does not cause row jumping.** Unit tests verify the mechanism exists but no E2E test confirms the visual behavior.

---

### UC-3.30: Socket.IO Connection Lifecycle

| Scenario | Jest | Vitest | Cypress | Playwright | Gap? |
|----------|------|--------|---------|------------|------|
| Green "Connected" status on healthy connection | -- | -- | -- | parallel-editing-updates.spec.ts (checks text) | No |
| Yellow "Reconnecting..." during retry | -- | -- | -- | -- | **YES** |
| Red "Disconnected" after max retries | -- | -- | -- | -- | **YES** |
| Gray "Offline mode" when Socket.IO unavailable | -- | -- | -- | -- | **YES** |
| Reconnection triggers full data refresh | -- | -- | -- | -- | **YES** |
| Room join on physician switch | -- | -- | -- | -- | **YES** |

**Gaps:**
- **Connection state transitions:** Only "Connected" is verified. No test simulates disconnection, reconnection, or fallback states.

---

## Gap Summary

### Critical Gaps (0)
No critical gaps found. All core editing and conflict resolution flows are covered.

### High Priority Gaps (4)

| # | Gap | Why High | Recommended Test | Framework |
|---|-----|----------|-----------------|-----------|
| 1 | Tab navigation between cells | Core data entry workflow; users Tab through fields constantly | E2E test: edit Notes, Tab, verify cursor moves to next cell | Cypress |
| 2 | Rapid consecutive edits (3+ cells quickly) | Data integrity risk; spec EC-1 | E2E test: edit 3 cells via Tab, reload page, verify all persisted | Cypress |
| 3 | Time Interval validation (range, type, editability) | Silent data corruption if invalid values accepted | Unit test: valueSetter logic + E2E: enter invalid values | Vitest + Cypress |
| 4 | Special characters in text fields | XSS/injection risk, spec EC-4 | E2E test: enter quotes, HTML tags, verify correct rendering | Cypress |

### Medium Priority Gaps (6)

| # | Gap | Why Medium | Recommended Test | Framework |
|---|-----|-----------|-----------------|-----------|
| 5 | Escape key on text cells (Notes, Member Name) | UX: users expect Escape to cancel | E2E: Escape during Notes edit, verify revert | Cypress |
| 6 | Network failure during save (timeout/disconnect) | Error resilience; partial unit coverage only | E2E: intercept PUT with network error, verify toast + revert | Cypress |
| 7 | Cascading edit conflict (remote cascade cancels local edit) | Data consistency between concurrent users | E2E or integration test with Socket.IO | Playwright |
| 8 | Status bar unchanged on row selection | Spec AC-9, zero automation | E2E: click row, verify status bar counts unchanged | Cypress |
| 9 | Phone formatting (formatPhone helper) | Pure function, trivial to test | Unit test for formatPhone | Vitest |
| 10 | DOB editing (required field alert + date validation) | Data integrity for patient identity | E2E: clear DOB, verify alert | Cypress |

### Low Priority Gaps (8)

| # | Gap | Why Low | Recommended Test | Framework |
|---|-----|---------|-----------------|-----------|
| 11 | Presence indicator (X others online) | UX nicety, not data integrity | E2E: two contexts, verify count | Playwright |
| 12 | Socket reconnection flow | Reliability edge case | E2E: simulate disconnect, verify reconnect | Playwright |
| 13 | Import-in-progress banner | UX notification, not blocking | E2E: trigger import, verify banner | Playwright |
| 14 | Remote edit indicator visual (dashed orange border) | Visual polish | MCP Playwright visual review | Layer 5 |
| 15 | Remote edit tooltip (editor name on hover) | Visual polish | MCP Playwright visual review | Layer 5 |
| 16 | Flash animation on remote cell update | Visual polish | MCP Playwright visual review | Layer 5 |
| 17 | Sort freeze E2E (row does not jump on edit) | Existing unit coverage mitigates risk | E2E: sort column, edit, verify position | Cypress |
| 18 | Edit during loading state | Edge case, low frequency | E2E: try editing during initial load | Cypress |

---

## Recommendations

### Phase 1: High Priority (Estimated: 3-4 hours)

1. **Add Cypress test: Tab navigation between cells**
   - Edit Notes cell, press Tab, verify focus moves to next editable cell
   - Edit dropdown, press Tab, verify it selects + moves
   - File: `cell-editing.cy.ts` (extend existing)

2. **Add Cypress test: Rapid consecutive edits**
   - Edit Notes, Tab to next cell, edit, Tab, edit a third cell
   - Wait for all saves, reload page, verify all 3 values persisted
   - File: `cell-editing.cy.ts` (extend existing)

3. **Add Vitest + Cypress tests: Time Interval validation**
   - Vitest: test `isTimeIntervalEditable` function and valueSetter edge cases
   - Cypress: enter "abc", -1, 1001, empty into Time Interval, verify alert + revert
   - Files: new `PatientGrid.valueSetter.test.ts`, extend `cell-editing.cy.ts`

4. **Add Cypress test: Special characters in text fields**
   - Enter `Hello "world" <script>alert(1)</script>` into Notes
   - Verify text saved and displayed literally (no XSS execution)
   - File: `cell-editing.cy.ts` (extend existing)

### Phase 2: Medium Priority (Estimated: 2-3 hours)

5. **Add Cypress test: Escape on text cells**
   - Edit Notes, type new text, press Escape, verify revert
   - File: `cell-editing.cy.ts`

6. **Add Cypress test: Network failure during save**
   - Intercept PUT with `{ forceNetworkError: true }`, verify toast + cell revert
   - File: `cell-editing.cy.ts`

7. **Add Vitest test: formatPhone and formatDobMasked**
   - Pure function tests for all branches
   - File: new `PatientGrid.formatters.test.ts`

8. **Add Cypress test: Status bar unchanged on selection**
   - Record status bar text, click row, verify status bar unchanged
   - File: `cell-editing.cy.ts`

### Phase 3: Low Priority (Estimated: 2-3 hours)

9. **Add Playwright test: Presence awareness**
   - Two contexts, verify "1 other online" indicator
   - File: `parallel-editing-updates.spec.ts` (extend)

10. **Add Layer 5 visual review: Remote edit indicators**
    - MCP Playwright: verify dashed orange border, tooltip, flash animation
    - Manual review task

---

## Test Count Summary

| Category | Current Tests | New Tests (Recommended) | Total After |
|----------|--------------|------------------------|-------------|
| Vitest (component/hook) | ~113 | +8 | ~121 |
| Jest (backend) | ~20 | 0 | ~20 |
| Cypress E2E | ~47 | +12 | ~59 |
| Playwright E2E | ~6 | +2 | ~8 |
| **Total** | **~186** | **+22** | **~208** |
