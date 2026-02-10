# Implementation Plan: Compact Filter Bar with Quality Measure Dropdown

## Task Overview

This is a **frontend-only UI enhancement** modifying 3 existing files with no new files, no backend changes, and no database migrations. The implementation adds a Quality Measure dropdown filter and makes status chips compact (approximately 24px height, single-line with no text wrapping).

**Total estimated changes:** ~78 lines across 3 files
**Total estimated tests:** 33 tests across Vitest, Playwright, and Cypress

## Steering Document Compliance

- **structure.md compliance**: Modifies existing React components in `frontend/src/components/layout/` and `frontend/src/pages/` following established file organization
- **tech.md compliance**: Uses React hooks (useState, useMemo), TypeScript interfaces, Tailwind CSS utility classes, and existing props patterns
- **Existing patterns**: Extends the established filter state pattern (lifted to MainPage, passed down via props), maintains memo-based derived data, preserves existing chip toggle behavior

## Atomic Task Requirements

**Each task meets these criteria for optimal agent execution:**
- **File Scope**: Touches 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Exact files to create/modify specified
- **Agent-Friendly**: Clear input/output with minimal context switching

## Task Format Guidelines

- Use checkbox format: `- [ ] Task number. Task description`
- **Specify files**: Always include exact file paths to create/modify
- **Include implementation details** as bullet points
- Reference requirements using: `_Requirements: CFB-RX-ACY_`
- Reference existing code to leverage using: `_Leverage: path/to/file.ts_`
- Focus only on coding tasks (no deployment, user testing, etc.)
- **Avoid broad terms**: No "system", "integration", "complete" in task titles

## Tasks

### Phase 1: Component Interface Changes (Props & State)

- [ ] 1. Add selectedMeasure state and measureOptions in MainPage.tsx
  - File: `frontend/src/pages/MainPage.tsx`
  - Add `const [selectedMeasure, setSelectedMeasure] = useState<string>('All Measures');` after line 34 (after searchText state)
  - Import `QUALITY_MEASURE_TO_STATUS` from `../config/dropdownConfig`
  - Add `measureOptions` memo: `useMemo(() => Object.keys(QUALITY_MEASURE_TO_STATUS), [])`
  - Purpose: Establish measure filter state and derive measure list from config
  - **Estimated lines:** ~8 lines
  - _Leverage: existing state declarations (activeFilters, searchText), existing useMemo pattern for rowCounts_
  - _Requirements: CFB-R2-AC1, CFB-R6-AC1, CFB-R6-AC2, CFB-R6-AC3, CFB-R6-AC4_

- [ ] 2. Update StatusFilterBar props interface to accept measure filter props
  - File: `frontend/src/components/layout/StatusFilterBar.tsx`
  - Add three new props to `StatusFilterBarProps` interface (line 7-14):
    - `selectedMeasure: string;`
    - `onMeasureChange: (measure: string) => void;`
    - `measureOptions: string[];`
  - Update function signature to destructure new props (line 36)
  - Purpose: Extend component interface to support measure dropdown
  - **Estimated lines:** ~4 lines (interface changes only)
  - _Leverage: existing StatusFilterBarProps interface pattern_
  - _Requirements: CFB-R2-AC1_

- [ ] 3. Update StatusBar props interface to accept filterSummary
  - File: `frontend/src/components/layout/StatusBar.tsx`
  - Add `filterSummary?: string;` to `StatusBarProps` interface (line 1-4)
  - Update function signature to destructure filterSummary (line 6)
  - Purpose: Enable status bar to display active filter summary
  - **Estimated lines:** ~2 lines (interface changes only)
  - _Leverage: existing StatusBarProps interface pattern_
  - _Requirements: CFB-R5-AC1, CFB-R5-AC2_

### Phase 2: Filter Logic Implementation

- [ ] 4. Update rowCounts memo in MainPage.tsx to scope by selected measure
  - File: `frontend/src/pages/MainPage.tsx`
  - Modify `rowCounts` memo (line 50-75) to filter `rowData` by `selectedMeasure` before counting
  - Add measure scoping logic: `const scopedRows = selectedMeasure === 'All Measures' ? rowData : rowData.filter(row => row.qualityMeasure === selectedMeasure);`
  - Add `selectedMeasure` to memo dependencies array
  - Purpose: Make chip counts reflect only rows matching the selected measure
  - **Estimated lines:** ~5 lines (within existing memo)
  - _Leverage: existing rowCounts memo logic and getRowStatusColor import_
  - _Requirements: CFB-R4-AC1, CFB-R4-AC2, CFB-R4-AC3, CFB-R4-AC4_

- [ ] 5. Update filteredRowData memo in MainPage.tsx to add measure filter step
  - File: `frontend/src/pages/MainPage.tsx`
  - Insert measure filter as first step in `filteredRowData` memo (line 78-100)
  - Add before color filter: `if (selectedMeasure !== 'All Measures') { filtered = filtered.filter(row => row.qualityMeasure === selectedMeasure); }`
  - Add `selectedMeasure` to memo dependencies array
  - Purpose: Implement measure filter in the combined filter pipeline
  - **Estimated lines:** ~4 lines (within existing memo)
  - _Leverage: existing filteredRowData memo structure, existing filter pattern_
  - _Requirements: CFB-R2-AC5, CFB-R3-AC1, CFB-R3-AC2, CFB-R3-AC3, CFB-R3-AC4, CFB-R3-AC5, EC-3, EC-8_

- [ ] 6. Create filterSummary memo in MainPage.tsx
  - File: `frontend/src/pages/MainPage.tsx`
  - Add new memo after `filteredRowData` memo (around line 101)
  - Build summary parts array: color labels from `activeFilters`, measure from `selectedMeasure`
  - Return `parts.join(' | ')` or `undefined` if empty
  - Dependencies: `[activeFilters, selectedMeasure]`
  - Purpose: Generate human-readable filter summary for status bar
  - **Estimated lines:** ~20 lines (new memo)
  - _Leverage: existing useMemo pattern, STATUS_LABELS constant in design_
  - _Requirements: CFB-R5-AC2, CFB-R5-AC3, CFB-R5-AC4, CFB-R5-AC5_

- [ ] 7. Pass new props to StatusFilterBar and StatusBar in MainPage.tsx JSX
  - File: `frontend/src/pages/MainPage.tsx`
  - Add to `<StatusFilterBar>` props (around line 250): `selectedMeasure`, `onMeasureChange={setSelectedMeasure}`, `measureOptions`
  - Add to `<StatusBar>` props (around line 270): `filterSummary={filterSummary}`
  - Purpose: Thread state and callbacks down to child components
  - **Estimated lines:** ~4 lines (prop additions)
  - _Leverage: existing props passing pattern_
  - _Requirements: CFB-R2-AC1, CFB-R5-AC1_

### Phase 3: UI Implementation

- [ ] 8. Apply compact chip CSS in StatusFilterBar.tsx
  - File: `frontend/src/components/layout/StatusFilterBar.tsx`
  - Modify chip button className (line 95-103):
    - Change `px-3 py-1` to `px-2 py-0.5`
    - Change `text-sm` to `text-xs`
    - Change `gap-1.5` to `gap-1`
    - Change `border-2` to `border`
    - Add `whitespace-nowrap`
  - Change Check icon size from 14 to 12 (line 107)
  - Change count `text-xs` to `text-[10px]` (around line 110)
  - Purpose: Make chips compact (approximately 24px height, single-line)
  - **Estimated lines:** ~5 lines (CSS class changes)
  - _Leverage: existing chip button structure and Tailwind classes_
  - _Requirements: CFB-R1-AC1, CFB-R1-AC2, CFB-R1-AC3, CFB-R1-AC4_

- [ ] 9. Add zero-count chip opacity logic in StatusFilterBar.tsx
  - File: `frontend/src/components/layout/StatusFilterBar.tsx`
  - Add `const isZeroCount = count === 0;` inside map loop (around line 88)
  - Modify opacity logic to set `opacity-30` for zero-count non-active chips
  - Update className logic: `isZeroCount && !isActive ? 'opacity-30' : (!isActive ? 'opacity-50 hover:opacity-75' : '')`
  - Purpose: Visually indicate zero-count chips at 30% opacity
  - **Estimated lines:** ~3 lines (within existing map)
  - _Leverage: existing isActive logic, existing opacity classes_
  - _Requirements: CFB-R4-AC5, CFB-R4-AC6_

- [ ] 10. Add vertical divider and measure dropdown in StatusFilterBar.tsx
  - File: `frontend/src/components/layout/StatusFilterBar.tsx`
  - After last chip (around line 120, after map closing), add vertical divider: `<div className="w-px h-6 bg-gray-300 mx-2 self-center" />`
  - Add native `<select>` element with:
    - `value={selectedMeasure}`
    - `onChange={(e) => onMeasureChange(e.target.value)}`
    - `aria-label="Filter by quality measure"`
    - Conditional className: blue ring when `selectedMeasure !== 'All Measures'`
    - `<option value="All Measures">All Measures</option>` first
    - Map `measureOptions` to `<option>` elements
  - Add `flex-wrap` to container div (line 84) to handle narrow viewports
  - Purpose: Add measure dropdown with visual separation from chips
  - **Estimated lines:** ~17 lines (divider + dropdown JSX)
  - _Leverage: native select element, existing Tailwind focus ring pattern_
  - _Requirements: CFB-R2-AC1, CFB-R2-AC2, CFB-R2-AC3, CFB-R2-AC4, CFB-R2-AC6, CFB-R2-AC7, CFB-R2-AC8, CFB-R7-AC2 through CFB-R7-AC7, CFB-R1-AC5, EC-9_

- [ ] 11. Display filterSummary in StatusBar.tsx
  - File: `frontend/src/components/layout/StatusBar.tsx`
  - Add conditional rendering after row count span (line 10):
    - `{filterSummary && (<span className="text-gray-500 border-l border-gray-300 pl-4">{filterSummary}</span>)}`
  - Purpose: Show active filter summary next to row count
  - **Estimated lines:** ~4 lines (conditional JSX)
  - _Leverage: existing StatusBar layout structure_
  - _Requirements: CFB-R5-AC2, CFB-R5-AC3, CFB-R5-AC4, CFB-R5-AC5_

### Phase 4: Testing

- [ ] 12. Add compact chip and dropdown tests in StatusFilterBar.test.tsx
  - File: `frontend/src/components/layout/StatusFilterBar.test.tsx`
  - Add 14 new test cases:
    - Compact chip has `whitespace-nowrap` (CFB-R1-AC1)
    - Compact chip has `py-0.5` and `px-2` (CFB-R1-AC2)
    - Multi-word labels stay single line (CFB-R1-AC3)
    - Active chip still shows checkmark (CFB-R1-AC4)
    - Measure dropdown renders (CFB-R2-AC1)
    - Dropdown default is "All Measures" (CFB-R2-AC2)
    - Dropdown lists all measures (CFB-R2-AC3)
    - Dropdown calls onMeasureChange (CFB-R2-AC5)
    - Active measure shows blue ring (CFB-R2-AC6)
    - "All Measures" has no blue ring (CFB-R2-AC8)
    - Zero-count chip has `opacity-30` (CFB-R4-AC5)
    - Zero-count chip is clickable (CFB-R4-AC6)
    - Vertical divider renders (CFB-R2-AC1)
    - Dropdown has aria-label (CFB-R7-AC7)
  - Purpose: Verify compact chip styling and measure dropdown rendering
  - **Estimated tests:** ~14 tests
  - _Leverage: existing StatusFilterBar.test.tsx structure, React Testing Library_
  - _Requirements: CFB-R1, CFB-R2, CFB-R4-AC5/AC6, CFB-R7-AC7_

- [ ] 13. Add filterSummary tests in StatusBar.test.tsx
  - File: `frontend/src/components/layout/StatusBar.test.tsx`
  - Add 3 new test cases:
    - Shows filter summary when provided (CFB-R5-AC2/3)
    - No filter summary when undefined (CFB-R5-AC5)
    - Shows combined summary with pipe (CFB-R5-AC4)
  - Purpose: Verify filter summary display logic
  - **Estimated tests:** ~3 tests
  - _Leverage: existing StatusBar.test.tsx structure, React Testing Library_
  - _Requirements: CFB-R5_

- [ ] 14. Add filter logic integration tests in MainPage.test.tsx
  - File: `frontend/src/pages/MainPage.test.tsx`
  - Add 8 new test cases:
    - Measure filter scopes rowCounts (CFB-R4-AC2)
    - Measure + color filter AND logic (CFB-R3-AC2)
    - Measure + color + search AND logic (CFB-R3-AC3)
    - Duplicates + measure AND logic (CFB-R3-AC4)
    - Changing measure preserves color (CFB-R3-AC6)
    - "All Measures" shows all rows (CFB-R2-AC7)
    - Null qualityMeasure excluded (EC-8)
    - Filter summary generation (CFB-R5-AC2/3/4)
  - Purpose: Verify combined filter logic and state management
  - **Estimated tests:** ~8 tests
  - _Leverage: existing MainPage.test.tsx structure, mocking patterns_
  - _Requirements: CFB-R3, CFB-R4, CFB-R5, EC-8_

- [ ] 15. Add Playwright E2E tests for compact filter bar
  - File: `frontend/e2e/compact-filter-bar.spec.ts` (new file)
  - Add 5 E2E test cases:
    - Compact chips render on single line (CFB-R1-AC5)
    - Measure dropdown visible and functional (CFB-R2-AC1/5)
    - Combined filter updates status bar (CFB-R5-AC1/4)
    - Measure selection persists after cell edit (EC-2/EC-7)
    - Zero-count chip appears faded (CFB-R4-AC5)
  - Purpose: Verify end-to-end user interactions with filters
  - **Estimated tests:** ~5 tests
  - _Leverage: existing Playwright page objects (MainPage), auth fixture_
  - _Requirements: CFB-R1-AC5, CFB-R2, CFB-R5, CFB-R4-AC5, EC-2/EC-7_

- [ ] 16. Add Cypress E2E tests for grid integration
  - File: `frontend/cypress/e2e/compact-filter-bar.cy.ts` (new file)
  - Add 3 Cypress test cases:
    - Editing qualityMeasure updates filter (EC-2)
    - Grid shows correct rows for measure (CFB-R2-AC5)
    - Chip counts update for measure (CFB-R4-AC2)
  - Purpose: Verify AG Grid interactions with measure filter
  - **Estimated tests:** ~3 tests
  - _Leverage: existing Cypress AG Grid commands (selectAgGridDropdown, waitForAgGrid), auth helpers_
  - _Requirements: CFB-R2-AC5, CFB-R4-AC2, EC-2_

- [ ] 17. Exhaustive visual browser review using ui-ux-reviewer agent (Layer 5)
  - Launch the **ui-ux-reviewer** agent to open the running app in MCP Playwright browser
  - **EXHAUSTIVELY test every interaction — no cherry-picking:**
    - **Compact chips (click ALL 10):**
      - Click each chip individually (All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A)
      - Verify each chip activates with checkmark and correct color
      - Click chip again to toggle off → verify deactivation
      - Multi-select: click In Progress + Completed together → verify OR logic
      - Click All → verify all other chips deselect
      - Verify compact sizing: no text wrapping, single-line, ~24px height
    - **Measure dropdown (try ALL 13 measures + All Measures):**
      - Open dropdown → verify all 13 measures listed
      - Select EACH measure one by one:
        - Annual Wellness Visit → verify chip counts change, grid filters
        - Diabetic Eye Exam → verify chip counts change, grid filters
        - Diabetic Nephropathy → same
        - Hypertension Management → same
        - Diabetes Control → same
        - ACE/ARB in DM or CAD → same
        - Vaccination → same
        - GC/Chlamydia Screening → same
        - Breast Cancer Screening → same
        - Colon Cancer Screening → same
        - Cervical Cancer Screening → same
        - Chronic Diagnosis Code → same
        - Annual Serum K&Cr → same
      - Verify blue ring appears when measure is active
      - Select "All Measures" → verify blue ring disappears, counts reset
    - **Combined filters (test ALL combinations):**
      - Measure + color chip → verify AND logic (grid narrows)
      - Measure + search text → verify AND logic
      - Measure + color + search → verify triple AND
      - Measure + Duplicates chip → verify AND logic
      - Change measure while color is active → verify color persists
      - Clear measure while color is active → verify color persists
    - **Zero-count chips:**
      - Select a measure that produces zero-count chips
      - Verify zero-count chips at 30% opacity
      - Click a zero-count chip → verify it activates (shows 0 results)
    - **Status bar:**
      - Verify "Showing X of Y rows" updates with each filter change
      - Verify filter summary shows active filters (e.g., "Color: In Progress | Measure: Diabetic Eye Exam")
      - Verify summary clears when all filters reset
    - **Vertical divider:** visible between last chip and dropdown
    - **Search integration:** type patient name with measure active → verify AND
    - **Keyboard:** Tab to dropdown, use arrow keys to change measure
  - Take screenshots at EACH state change
  - Purpose: Exhaustive visual verification — simulate real user exploring every interaction
  - **Estimated time:** ~25 minutes
  - _Requirements: ALL (CFB-R1 through CFB-R7), ALL edge cases (EC-1 through EC-11)_

## Implementation Summary

### Files Modified (3 files, no new files)
| File | Lines Changed | Type |
|------|--------------|------|
| `frontend/src/components/layout/StatusFilterBar.tsx` | ~40 lines | Modify (compact CSS + dropdown + divider + zero-count opacity) |
| `frontend/src/pages/MainPage.tsx` | ~30 lines | Modify (state, memos, filterSummary, props) |
| `frontend/src/components/layout/StatusBar.tsx` | ~8 lines | Modify (prop + conditional rendering) |
| **Total** | **~78 lines** | **3 files modified** |

### Files Created (2 test files)
| File | Tests |
|------|-------|
| `frontend/e2e/compact-filter-bar.spec.ts` | 5 tests |
| `frontend/cypress/e2e/compact-filter-bar.cy.ts` | 3 tests |

### Test Files Modified (3 files)
| File | New Tests |
|------|-----------|
| `frontend/src/components/layout/StatusFilterBar.test.tsx` | 14 tests |
| `frontend/src/components/layout/StatusBar.test.tsx` | 3 tests |
| `frontend/src/pages/MainPage.test.tsx` | 8 tests |
| **Total Vitest** | **25 tests** |
| **Total Playwright** | **5 tests** |
| **Total Cypress** | **3 tests** |
| **Grand Total** | **33 tests** |

### Dependency Chain Overview
```
Phase 1 (Props & State) → Phase 2 (Filter Logic) → Phase 3 (UI) → Phase 4 (Testing)

Task 1 (MainPage state) ────┬─→ Task 4 (rowCounts)  ─┐
                             │                        │
Task 2 (StatusFilterBar)  ───┼─→ Task 5 (filteredRowData)  ─→ Task 10 (dropdown UI)
                             │                        │
Task 3 (StatusBar) ──────────┴─→ Task 6 (filterSummary) ──→ Task 11 (summary display)
                                         │
                          Task 7 (pass props) ←─┐
                                         │       │
                          Task 8 (compact CSS)  │
                          Task 9 (zero-count)───┘

Phase 4 can start after Task 11 (all implementation complete)
Task 17 (visual review) runs after all other tasks are complete
```

### Estimated Implementation Time
- **Phase 1** (Tasks 1-3): 15 minutes (interface changes only)
- **Phase 2** (Tasks 4-7): 30 minutes (filter logic)
- **Phase 3** (Tasks 8-11): 30 minutes (UI implementation)
- **Phase 4** (Tasks 12-16): 90 minutes (automated testing)
- **Phase 5** (Task 17): 15 minutes (visual browser review)
- **Total**: ~180 minutes (~3 hours)

### Key Reuse Points from Existing Codebase
| Existing Code | Reuse Context |
|--------------|---------------|
| `MainPage` state pattern | `selectedMeasure` follows same pattern as `activeFilters` and `searchText` |
| `rowCounts` memo | Extended to scope by measure, same structure preserved |
| `filteredRowData` memo | Extended with measure filter step, same pipeline pattern |
| `StatusFilterBar` chip rendering | Compact CSS applied to existing button structure |
| `StatusBar` layout | Filter summary added next to existing row count |
| `QUALITY_MEASURE_TO_STATUS` config | Keys provide dropdown options (13 measures) |
| `getRowStatusColor` function | Used unchanged for chip counts |
| Existing test patterns | Vitest RTL, Playwright page objects, Cypress AG Grid commands |

### Edge Cases Handled
| Edge Case | Handling Location | Mechanism |
|-----------|-------------------|-----------|
| EC-1: No matching rows for status | Task 9 (zero-count opacity) | 30% opacity, remains clickable |
| EC-2: Data changes via cell edit | Task 5 (filteredRowData memo) | Memo recalculates on rowData change |
| EC-3: New row with null qualityMeasure | Task 5 (filteredRowData memo) | `null !== selectedMeasure` excludes row |
| EC-4: Duplicates + measure filter | Task 5 (filteredRowData memo) | Measure filter applied first |
| EC-8: Null qualityMeasure rows | Task 5 (filteredRowData memo) | Strict equality check |
| EC-9: Narrow viewport | Task 10 (dropdown UI) | `flex-wrap` allows wrapping |
| EC-11: Rapid measure switching | Task 5 (React memo) | Synchronous, no race conditions |

### Requirements Traceability
All 7 requirements (CFB-R1 through CFB-R7) with 42 acceptance criteria are mapped to specific tasks:
- **CFB-R1** (Compact Chips): Tasks 8, 12
- **CFB-R2** (Quality Measure Dropdown): Tasks 1, 2, 5, 7, 10, 12, 15, 16
- **CFB-R3** (Combined Filter Logic): Tasks 5, 14
- **CFB-R4** (Chip Count Scoping): Tasks 4, 9, 12, 14, 16
- **CFB-R5** (Status Bar Updates): Tasks 3, 6, 7, 11, 13, 14, 15
- **CFB-R6** (Quality Measure Data Source): Task 1
- **CFB-R7** (Keyboard Accessibility): Task 10, 12
