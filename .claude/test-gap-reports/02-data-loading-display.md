# Test Gap Analysis: Data Loading & Display

## Summary
- Total Use Cases Identified: 35
- Fully Covered: 20
- Partially Covered: 8
- Not Covered: 7
- Coverage Score: 69% (20 fully + 8 partial*0.5 / 35 = 68.6%)

---

## Use Cases

### UC-2.1: Initial Page Load — Grid Renders with Patient Data
**Description:** When a logged-in user navigates to the main page, the grid loads and displays patient measures from the API (`GET /api/data`).
**Priority:** Critical
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `GET /api/data > returns grid data for PHYSICIAN user` |
| Vitest | NOT COVERED | — | No MainPage render/mount test (logic tests only) |
| Playwright | COVERED | `frontend/e2e/smoke.spec.ts` | `page loads and shows grid` |
| Cypress | COVERED | `frontend/cypress/e2e/sorting-filtering.cy.ts` | `beforeEach` verifies `.ag-body-viewport` exists and rows render |

**Verdict: PARTIALLY COVERED** — Backend and E2E cover it, but no Vitest component-level mount test for MainPage (all MainPage tests are pure-function logic tests, not render tests).

---

### UC-2.2: Loading Spinner During Data Fetch
**Description:** While data is loading, a spinner with "Loading patient data..." text displays. Spinner disappears when load completes.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | Backend does not render spinners |
| Vitest | NOT COVERED | — | No test for `loading` state rendering in MainPage |
| Playwright | PARTIAL | `frontend/e2e/smoke.spec.ts` | `page loads and shows grid` (implicitly waits for grid; does not assert spinner) |
| Cypress | NOT COVERED | — | No explicit spinner assertion |

**Verdict: NOT COVERED** — The `loading` state and `<Loader2>` spinner in MainPage.tsx are not tested by any framework. The MainPage.test.tsx file only tests pure filtering logic, not component rendering.

---

### UC-2.3: Error State on API Failure
**Description:** When `GET /api/data` fails, an error message appears with a "Retry" button. Clicking Retry re-fetches data.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | Auth tests return 401; role tests return 400/403 |
| Vitest | NOT COVERED | — | No test for `error` state rendering or Retry button in MainPage |
| Playwright | NOT COVERED | — | No API-mocked failure test |
| Cypress | NOT COVERED | — | No network stub failure test |

**Verdict: NOT COVERED** — The error UI (`<p className="text-red-600">`) and Retry button in MainPage.tsx lines 501-514 are not tested. This is a medium-priority gap since error handling is critical for user experience.

---

### UC-2.4: Empty State — No Patients Assigned
**Description:** When the API returns zero rows, the grid displays with no data. Status bar shows "Showing 0 of 0 rows".
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `GET /api/data > returns empty array when no data` |
| Vitest | PARTIAL | `frontend/src/components/grid/PatientGrid.test.tsx` | `renders AG Grid with empty rowData` |
| Vitest | COVERED | `frontend/src/components/layout/StatusBar.test.tsx` | `shows zero rows correctly` |
| Playwright | NOT COVERED | — | No E2E test for empty grid state |
| Cypress | NOT COVERED | — | No E2E test for empty grid state |

**Verdict: PARTIALLY COVERED** — Unit level covers empty grid rendering and status bar "0 rows". No E2E validates the full user journey of an empty dataset.

---

### UC-2.5: Grid Column Definitions — 13 Columns Total (10 Visible + 3 Hidden)
**Description:** The grid has 13 column definitions. By default 10 are visible (Request Type, Member Name, Quality Measure, Measure Status, Status Date, Tracking #1, Tracking #2, Due Date, Time Interval (Days), Notes). Three are hidden (DOB, Telephone, Address).
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | Backend does not define grid columns |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `passes correct number of column definitions` (13 cols); `includes all expected column fields`; `hides member info columns when showMemberInfo is false` |
| Playwright | PARTIAL | `frontend/e2e/smoke.spec.ts` | `page loads and shows grid` (does not verify specific columns) |
| Cypress | PARTIAL | `frontend/cypress/e2e/sorting-filtering.cy.ts` | Implicitly uses column headers but does not enumerate all |

**Verdict: FULLY COVERED** — Vitest thoroughly validates column count, field names, hidden state. E2E smoke test covers grid presence.

---

### UC-2.6: Member Info Toggle — Show/Hide DOB, Telephone, Address
**Description:** Clicking the "Member Info" button in the toolbar toggles the visibility of DOB, Telephone, and Address columns.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | Backend does not manage UI state |
| Vitest | COVERED | `frontend/src/components/layout/Toolbar.test.tsx` | `calls onToggleMemberInfo when clicked`; `Member Info button reflects showMemberInfo toggle state via class` |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `hides member info columns when showMemberInfo is false`; `shows member info columns when showMemberInfo is true` |
| Playwright | NOT COVERED | — | No E2E test for member info toggle |
| Cypress | NOT COVERED | — | No E2E test for member info toggle (MainPage page object has `toggleMemberInfo()` helper but no test calls it) |

**Verdict: FULLY COVERED** at unit level. No E2E coverage.

---

### UC-2.7: DOB Masking — Displays as "###"
**Description:** When DOB column is visible, all DOB values display as "###" for privacy masking (never shows actual date).
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `has valueFormatter that masks DOB value for privacy` (returns "###"); `DOB valueFormatter returns empty string for null value` |
| Playwright | NOT COVERED | — | No E2E validates "###" in the grid |
| Cypress | NOT COVERED | — | No E2E validates "###" in the grid |

**Verdict: FULLY COVERED** at unit level via Vitest valueFormatter tests. E2E gap is low priority since the formatter is deterministic.

---

### UC-2.8: Phone Number Formatting — (XXX) XXX-XXXX
**Description:** When Telephone column is visible, phone numbers display formatted as (555) 123-4567.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | NOT COVERED | — | No test for `formatPhone` function or the telephone valueFormatter |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: NOT COVERED** — The `formatPhone` helper (PatientGrid.tsx lines 120-127) has NO tests in any framework. The function handles 10-digit phone formatting and non-10-digit passthrough. This is a gap.

---

### UC-2.9: Date Formatting — M/D/YYYY Display
**Description:** Status Date and Due Date columns display dates in M/D/YYYY format without leading zeros (e.g., "1/5/2023").
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/utils/__tests__/dateFormatter.test.ts` | `formatDate > formats a valid ISO date without leading zeros`; 6 tests total covering null, empty, various dates |
| Playwright | NOT COVERED | — | No E2E validates date format in cells |
| Cypress | PARTIAL | `frontend/cypress/e2e/sorting-filtering.cy.ts` | Implicitly reads dates from cells for sort validation |

**Verdict: FULLY COVERED** — `formatDate` unit tests cover all scenarios thoroughly.

---

### UC-2.10: Status Bar — "Showing X of Y rows"
**Description:** The status bar displays "Showing X of Y rows" where X is filtered count and Y is total count. Supports locale number formatting for large numbers.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/layout/StatusBar.test.tsx` | 5 tests: `shows "Showing X of Y rows" when filtered`; `Showing X of X rows when not filtered`; `totalRowCount undefined`; `formats large numbers`; `shows zero rows` |
| Playwright | PARTIAL | `frontend/e2e/smoke.spec.ts` | Page object has `getStatusBarText()` but smoke test doesn't assert row count text |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** — StatusBar component tests are comprehensive.

---

### UC-2.11: Status Bar — Filter Summary Display
**Description:** When filters are active (color, measure, insurance group), the status bar shows a summary like "Color: In Progress | Measure: Diabetic Eye Exam | Insurance: Hill".
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/layout/StatusBar.test.tsx` | `shows filter summary when provided`; `does not show filter summary when undefined`; `shows combined summary with pipe separator` |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | `filterSummary with insurance group` (6 tests covering Insurance, Color, Measure combinations) |
| Playwright | NOT COVERED | — | |
| Cypress | COVERED | `frontend/cypress/e2e/insurance-group-filter.cy.ts` | `status bar displays insurance filter text when active` |

**Verdict: FULLY COVERED** — Unit + E2E cover the filter summary well.

---

### UC-2.12: Provider Dropdown — ADMIN Switches Between Physicians
**Description:** ADMIN users see a "Viewing provider:" dropdown to switch between physicians. Selecting a physician reloads the grid with that physician's patients. "Unassigned patients" option available.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `ADMIN role > can view any physician by ID`; `can view unassigned patients`; `requires physicianId param` |
| Vitest | COVERED | `frontend/src/components/layout/Header.test.tsx` | 6 tests: `shows provider dropdown for ADMIN`; `NOT show on Import page`; `NOT show on Admin page`; `Unassigned patients option`; `setSelectedPhysicianId with null`; `setSelectedPhysicianId with number` |
| Playwright | NOT COVERED | — | No E2E test for provider dropdown interaction |
| Cypress | NOT COVERED | — | No E2E test for provider dropdown interaction |

**Verdict: FULLY COVERED** — Backend + Vitest cover all roles and interactions.

---

### UC-2.13: Provider Dropdown — STAFF Sees Assigned Physicians Only
**Description:** STAFF users see a "Viewing as:" dropdown limited to their assigned physicians. Cannot see "Unassigned patients" option. Must select a physician before data loads.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `STAFF role > requires physicianId param`; `can view assigned physician`; `cannot view unassigned patients`; `cannot view non-assigned physician` |
| Vitest | COVERED | `frontend/src/components/layout/Header.test.tsx` | `shows provider dropdown for STAFF`; `NOT show "Unassigned patients" for STAFF` |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | `STAFF empty-state logic > staffHasNoAssignments`; `needsPhysicianSelection` (9 tests) |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** — Backend + Vitest cover all STAFF scenarios.

---

### UC-2.14: Provider Dropdown — PHYSICIAN Auto-Filters to Own Patients
**Description:** PHYSICIAN users see only their own patients automatically. No dropdown is shown.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `PHYSICIAN role > auto-filters to own patients`; `ignores physicianId query param` |
| Vitest | COVERED | `frontend/src/components/layout/Header.test.tsx` | `NOT show provider dropdown for PHYSICIAN user` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** — Backend + Vitest cover the behavior.

---

### UC-2.15: ADMIN+PHYSICIAN Dual Role Behavior
**Description:** Users with both ADMIN and PHYSICIAN roles get ADMIN behavior (dropdown, view any physician, view unassigned).
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `ADMIN+PHYSICIAN dual role > gets ADMIN behavior`; `can view unassigned patients`; `requires physicianId param` |
| Vitest | COVERED | `frontend/src/components/layout/Header.test.tsx` | `ADMIN+PHYSICIAN Dual Role Behavior` (4 tests) |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED**

---

### UC-2.16: STAFF No Assignments — Empty State Message
**Description:** STAFF user with zero physician assignments sees "No Physician Assignments" message with instructions to contact admin.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | `STAFF with zero assignments triggers "No Physician Assignments"`; 4 tests total |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level. No E2E.

---

### UC-2.17: STAFF/ADMIN Needs Physician Selection — Prompt State
**Description:** STAFF/ADMIN user who hasn't selected a physician sees "Select a Physician" prompt with instructions.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | `needsPhysicianSelection` (5 tests for STAFF/ADMIN/PHYSICIAN with various states) |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level. No E2E.

---

### UC-2.18: Insurance Group Filter on Load
**Description:** Grid defaults to "hill" insurance group filter on initial load. API request includes `insuranceGroup=hill`. Changing the filter reloads data.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | 7 tests: `filters by insuranceGroup=hill`; `insuranceGroup=none`; `insuranceGroup=all`; `no param`; `invalid insuranceGroup`; `combines with physicianId`; `includes insuranceGroup in response` |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | `Insurance Group > default state`; `API query params` (6 tests); `filterSummary` (5 tests); `changing triggers re-fetch` |
| Playwright | NOT COVERED | — | |
| Cypress | COVERED | `frontend/cypress/e2e/insurance-group-filter.cy.ts` | 11 tests: dropdown rendering, visual indicators, filtering behavior, filter persistence |

**Verdict: FULLY COVERED** — Comprehensive coverage across all layers.

---

### UC-2.19: Grid Data Flattening — API Response Structure
**Description:** Backend flattens patient + measure data into a single row object for the grid. Each row includes: id, patientId, memberName, memberDob, memberTelephone, memberAddress, insuranceGroup, requestType, qualityMeasure, measureStatus, statusDate, statusDatePrompt, tracking1, tracking2, dueDate, timeIntervalDays, notes, rowOrder, isDuplicate.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | COVERED | `backend/src/routes/__tests__/data.routes.test.ts` | `flattens patient data into grid rows` (verifies patientId, memberDob, memberTelephone, qualityMeasure) |
| Vitest | N/A | — | Frontend consumes the structure |
| Playwright | N/A | — | |
| Cypress | N/A | — | |

**Verdict: FULLY COVERED** — Backend test validates the flattened structure.

---

### UC-2.20: Row Class Rules — Status-Based Row Colors
**Description:** Rows are colored based on measureStatus: white (not addressed), green (completed), blue (in progress), yellow (contacted/scheduled), purple (declined), gray (N/A), orange (resolved/invalid), red (overdue). Duplicate rows get additive left-stripe.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | 13 tests: `marks duplicate rows`; `applies green status`; `applies blue status`; `applies gray status`; `applies purple status`; `applies yellow status`; `applies orange status`; `applies white status`; `overdue takes priority`; `declined NOT overdue`; `gray NOT overdue`; chronic diagnosis attestation tests |
| Vitest | COVERED | `frontend/src/config/statusColors.test.ts` | ~71 test expressions covering `getRowStatusColor` and status classification |
| Playwright | NOT COVERED | — | |
| Cypress | PARTIAL | `frontend/cypress/e2e/sorting-filtering.cy.ts` | `Row selection preserves color` (tests CSS class but not all colors) |

**Verdict: FULLY COVERED** — Very thorough unit-level coverage of all color rules.

---

### UC-2.21: Column Header Tooltips
**Description:** All grid columns have headerTooltip set for accessibility and clarity.
**Priority:** Low
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `all columns have headerTooltip set` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.22: Column Resize and Reorder
**Description:** Users can resize columns (drag header border) and the grid supports column reordering (defaultColDef.resizable=true).
**Priority:** Low
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `provides default column definitions with sortable, filter, and resizable` (resizable=true) |
| Playwright | NOT COVERED | — | No drag-to-resize E2E test |
| Cypress | NOT COVERED | — | No drag-to-resize E2E test |

**Verdict: PARTIALLY COVERED** — Config is tested; actual resize interaction not tested. Low priority since AG Grid handles this internally.

---

### UC-2.23: Request Type Column Values — AWV, Chronic DX, Quality, Screening
**Description:** The Request Type dropdown contains specific values: AWV, Chronic DX, Quality, Screening.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `requestType uses AutoOpenSelectEditor with cellEditorPopup` (verifies editor type) |
| Vitest | PARTIAL | `frontend/src/components/grid/PatientGrid.test.tsx` mock | Mock sets `REQUEST_TYPES: ['AWV', 'Chronic DX', 'Quality', 'Screening']` |
| Playwright | NOT COVERED | — | |
| Cypress | PARTIAL | Various cy.ts files | Dropdown interactions implicitly validate values but no explicit enumeration test |

**Verdict: PARTIALLY COVERED** — No explicit test validates that the correct dropdown values render for requestType.

---

### UC-2.24: N/A Values in Tracking Columns
**Description:** Tracking #1 and Tracking #2 columns show "N/A" text with striped overlay when no dropdown options are available for the current measureStatus.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | NOT COVERED | — | No test for the tracking1/tracking2 valueFormatter logic that returns "N/A" |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: NOT COVERED** — The tracking1 valueFormatter (PatientGrid.tsx ~718-756) and tracking2 valueFormatter (~809-831) with "N/A" display logic and cellClass stripe-overlay/cell-disabled are untested.

---

### UC-2.25: Notes Column Truncation and Full Width
**Description:** Notes column has `flex: 1` to fill remaining space and renders full text content.
**Priority:** Low
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `notes column has flex=1 to fill remaining space` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.26: Request Type and Member Name Pinned Left
**Description:** Request Type and Member Name columns are pinned to the left side of the grid for always-visible context.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `has requestType and memberName pinned to the left` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.27: Due Date Column — Non-Editable (Calculated)
**Description:** Due Date column is not editable. It is a calculated field based on statusDate, measureStatus, and tracking values.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/grid/PatientGrid.test.tsx` | `dueDate column is NOT editable (calculated field)` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.28: Connection Status Indicator in Status Bar
**Description:** Status bar shows a colored dot + text indicating WebSocket connection status: green "Connected", yellow "Reconnecting...", red "Disconnected", gray "Offline mode". No indicator during "connecting" state.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/layout/StatusBar.test.tsx` | 5 tests: `green "Connected"`; `yellow "Reconnecting..."`; `red "Disconnected"`; `gray "Offline mode"`; `no indicator when connecting` |
| Playwright | NOT COVERED | — | No E2E tests connection status |
| Cypress | NOT COVERED | — | No E2E tests connection status |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.29: Presence Indicator — Users Online
**Description:** Status bar shows "X other(s) online" when other users are viewing the same physician's data. Tooltip shows user names on hover.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/layout/StatusBar.test.tsx` | 5 tests: `shows presence indicator`; `pluralizes "others"`; `hides when empty`; `shows tooltip with names on hover`; `hides tooltip on mouse leave` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.30: Save Status Indicator in Toolbar
**Description:** Toolbar shows save status: nothing for idle, "Saving..." spinner for saving, "Saved" checkmark, "Save failed" error icon.
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/components/layout/Toolbar.test.tsx` | 4 tests: `shows nothing when idle`; `shows "Saving..."`; `shows "Saved"`; `shows "Save failed"` |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: FULLY COVERED** at unit level.

---

### UC-2.31: Quality Measure Filter in Filter Bar
**Description:** Dropdown to filter rows by quality measure. "All Measures" shows all. Selecting a measure filters grid and scopes row counts.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | 10 tests: `filters by selected measure`; `"All Measures" shows all`; `excludes null qualityMeasure`; `measure + color filter`; `measure + color + search`; `measure-scoped rowCounts` (4 tests); `changing measure preserves color filter` |
| Playwright | NOT COVERED | — | |
| Cypress | COVERED | `frontend/cypress/e2e/insurance-group-filter.cy.ts` | `should persist insurance group filter when quality measure changes`; `should combine insurance group filter with quality measure filter` |

**Verdict: FULLY COVERED**

---

### UC-2.32: Color Status Filter Bar
**Description:** Chip-based filter bar with multi-select OR logic for status colors (All, Not Addressed, Overdue, In Progress, etc.). Counts shown per chip. Combining with search uses AND logic.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | 20+ tests: multi-select OR logic, AND with search, AND with measure, duplicate filter, clearing search, rowCounts independence |
| Vitest | COVERED | `frontend/src/components/layout/StatusFilterBar.test.tsx` | ~143 test expressions |
| Playwright | PARTIAL | `frontend/e2e/smoke.spec.ts` | `filter bar is visible with chips` (verifies "All" chip visible) |
| Cypress | NOT COVERED | — | No chip-clicking tests in sorting-filtering.cy.ts |

**Verdict: FULLY COVERED**

---

### UC-2.33: Patient Name Search (Ctrl+F)
**Description:** Text search input filters grid by patient name. Multi-word search matches independently ("williams robert" matches "Williams, Robert"). Ctrl+F focuses the search input.
**Priority:** High
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | COVERED | `frontend/src/pages/MainPage.test.tsx` | 13 tests: case-insensitive, partial match, multi-word, null memberName, whitespace handling, search+filter AND logic |
| Playwright | NOT COVERED | — | |
| Cypress | COVERED | `frontend/cypress/e2e/patient-name-search.cy.ts` | Tests search interaction in real browser |

**Verdict: FULLY COVERED**

---

### UC-2.34: Large Dataset Performance (11,000+ Rows)
**Description:** AG Grid uses row virtualization to handle large datasets efficiently. The grid should not lag or crash with 11,000+ rows.
**Priority:** Low
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | NOT COVERED | — | No performance test |
| Playwright | NOT COVERED | — | No performance test |
| Cypress | NOT COVERED | — | No performance test |

**Verdict: NOT COVERED** — This is a manual/performance test gap. AG Grid handles virtualization automatically, so this is low priority.

---

### UC-2.35: Import In-Progress Banner
**Description:** When a data import is in progress (via WebSocket), a yellow banner appears: "A data import is in progress (started by X). You can continue working -- the grid will update automatically when complete."
**Priority:** Medium
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | N/A | — | |
| Vitest | NOT COVERED | — | No test for `importInProgress` banner rendering in MainPage |
| Playwright | NOT COVERED | — | |
| Cypress | NOT COVERED | — | |

**Verdict: NOT COVERED** — The import banner UI (MainPage.tsx lines 519-530) with `data-testid="import-banner"` has no tests.

---

## Gap Summary

### Critical Gaps (No Coverage)

| # | Use Case | Priority | Details |
|---|----------|----------|---------|
| 1 | **UC-2.2: Loading Spinner** | High | MainPage `loading` state, `<Loader2>` spinner, "Loading patient data..." text — not tested in any framework |
| 2 | **UC-2.3: Error State + Retry** | High | MainPage `error` state, red error message, "Retry" button — not tested in any framework |
| 3 | **UC-2.8: Phone Number Formatting** | Medium | `formatPhone()` function in PatientGrid.tsx has zero tests. Handles 10-digit formatting and passthrough for non-10-digit |
| 4 | **UC-2.24: Tracking N/A Display** | Medium | Tracking #1/#2 `valueFormatter` returning "N/A" text and `cellClass` with stripe-overlay/cell-disabled — not tested |
| 5 | **UC-2.34: Large Dataset Performance** | Low | No performance benchmarks for 11,000+ rows |
| 6 | **UC-2.35: Import In-Progress Banner** | Medium | Yellow banner for active import not tested |

### Partial Gaps (Need More Coverage)

| # | Use Case | What's Missing |
|---|----------|----------------|
| 1 | **UC-2.1: Initial Page Load** | No Vitest render test for MainPage component (only pure-function logic tests). All MainPage tests avoid mounting the actual component. |
| 2 | **UC-2.4: Empty State** | No E2E test for the full empty-state user journey |
| 3 | **UC-2.6: Member Info Toggle** | No E2E test (Playwright or Cypress) for the toggle interaction, despite the `toggleMemberInfo()` helper existing in the Page Object |
| 4 | **UC-2.22: Column Resize** | Config tested, but no interaction test for drag-to-resize |
| 5 | **UC-2.23: Request Type Values** | No explicit test validates the full list of dropdown values rendering in the DOM |
| 6 | **UC-2.7: DOB Masking E2E** | Unit test covers it, but no E2E validates "###" displays in the actual grid |
| 7 | **UC-2.9: Date Formatting E2E** | Unit test covers `formatDate`, but no E2E validates date display format in cells |
| 8 | **UC-2.32: Color Filter E2E** | Comprehensive Vitest coverage but no Cypress test for clicking filter chips |

---

## Recommendations

### Immediate (Should Fix)

1. **Add `formatPhone` unit tests** (Vitest)
   - File: `frontend/src/components/grid/__tests__/formatPhone.test.ts` or add to `PatientGrid.test.tsx`
   - Test 10-digit formatting: `"5551234567"` -> `"(555) 123-4567"`
   - Test non-10-digit passthrough: `"555-1234"` -> `"555-1234"`
   - Test null/empty input: `null` -> `""`; `""` -> `""`
   - Estimated: 4-5 tests

2. **Add MainPage error state test** (Vitest)
   - Create a render test that mocks `api.get` to reject
   - Verify error message and Retry button render
   - Verify clicking Retry calls `loadData` again
   - Estimated: 3-4 tests

3. **Add MainPage loading state test** (Vitest)
   - Create a render test that delays `api.get` response
   - Verify spinner and "Loading patient data..." text render
   - Verify spinner disappears on load completion
   - Estimated: 2-3 tests

4. **Add Tracking column N/A display tests** (Vitest)
   - Test the `valueFormatter` for tracking1 and tracking2 returning "N/A"
   - Test the `cellClass` returning `stripe-overlay cell-disabled`
   - Test prompt text for empty editable fields ("Select time period", "HgbA1c value", "Testing interval", "BP reading")
   - Estimated: 8-10 tests

5. **Add import banner test** (Vitest)
   - Test that `data-testid="import-banner"` renders when `importInProgress` is true
   - Test banner text includes `importedBy` name
   - Test banner hidden when `importInProgress` is false
   - Estimated: 3 tests

### Nice-to-Have (E2E Improvements)

6. **Add Member Info toggle E2E test** (Cypress)
   - Use existing `toggleMemberInfo()` helper in MainPage page object
   - Verify DOB column shows "###", telephone shows formatted phone
   - Verify toggle off hides columns again

7. **Add error state E2E test** (Playwright)
   - Use `page.route()` to mock API failure
   - Verify error message and Retry button
   - Verify retry succeeds on second attempt

8. **Add empty grid E2E test** (Playwright)
   - Mock API to return empty array
   - Verify grid renders with no rows
   - Verify status bar shows "Showing 0 of 0 rows"

---

## Test Count by Framework (Data Loading & Display Area)

| Framework | File | Test Count | Coverage Area |
|-----------|------|------------|---------------|
| **Jest** | `backend/src/routes/__tests__/data.routes.test.ts` | ~35 | API CRUD, auth, role filtering, insurance group |
| **Vitest** | `frontend/src/pages/MainPage.test.tsx` | ~80 | Filtering logic, search, insurance group, STAFF states |
| **Vitest** | `frontend/src/components/grid/PatientGrid.test.tsx` | ~55 | Column defs, member info toggle, row colors, config |
| **Vitest** | `frontend/src/components/layout/StatusBar.test.tsx` | ~15 | Row count, filter summary, connection, presence |
| **Vitest** | `frontend/src/components/layout/Toolbar.test.tsx` | ~15 | Buttons, save status, member info toggle |
| **Vitest** | `frontend/src/components/layout/Header.test.tsx` | ~25 | Provider dropdown, roles, password modal |
| **Vitest** | `frontend/src/utils/__tests__/dateFormatter.test.ts` | ~10 | Date formatting |
| **Vitest** | `frontend/src/config/statusColors.test.ts` | ~71 | Status color classification |
| **Vitest** | `frontend/src/components/layout/StatusFilterBar.test.tsx` | ~40 | Filter bar chips, interactions |
| **Playwright** | `frontend/e2e/smoke.spec.ts` | 4 | Page load, grid visible, toolbar, filter bar |
| **Cypress** | `frontend/cypress/e2e/sorting-filtering.cy.ts` | ~20 | Sorting, initial load |
| **Cypress** | `frontend/cypress/e2e/insurance-group-filter.cy.ts` | ~11 | Insurance group dropdown and filtering |
| **Total** | | **~381** | |
