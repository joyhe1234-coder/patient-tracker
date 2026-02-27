# M7 Filtering & Search — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.5
**Spec:** `.claude/specs/test-filtering-search/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `StatusFilterBar.test.tsx` | Vitest | 115 | Chip rendering, multi-select, checkmark/fill, search, QM dropdown, insurance, zero-count, compact, pinned badge, color accuracy groups |
| `StatusBar.test.tsx` | Vitest | 18 | Row count display, filter summary, connection status, presence |
| `MainPage.test.tsx` | Vitest | 68 | `filterRows` logic, name search, status filter, multi-select OR, QM filter, combined AND, pinned row bypass, measure-scoped rowCounts, insurance group |
| `multi-select-filter.cy.ts` | Cypress | 19 | Multi-select toggle, Duplicates exclusivity, checkmark, search+multi-filter |
| `patient-name-search.cy.ts` | Cypress | 21 | Search UI, filtering, clear, filter combo AND, keyboard shortcuts |
| `insurance-group-filter.cy.ts` | Cypress | 13 | Dropdown rendering, visual indicators, filtering, persistence |
| `compact-filter-bar.cy.ts` | Cypress | 4 | Grid row filtering by measure, chip count, measure+color AND |
| `sorting-filtering.cy.ts` | Cypress | 63 | Status filter bar chips, per-color filter, toggle, sort+filter, status bar |
| `compact-filter-bar.spec.ts` | Playwright | 5 | Compact chip styling, measure dropdown, combined filtering |
| **Total** | | **~326** | |

---

## Planned New Tests (~35 tests)

### Tier 1 — Must Have (8 tests)

#### T1-1: Combined Filters (Color + QM + Insurance + Search) (8 Cypress tests)

**Gap:** Users always combine filters in practice, but no E2E test verifies more than 2 filter dimensions simultaneously. The spec identifies this as the #1 priority gap.

**Spec refs:** REQ-M7-6, GAP-6.1, GAP-6.2, GAP-6.5

**File:** `frontend/cypress/e2e/combined-filters.cy.ts` (new)

| # | Test Name | What It Verifies | Roles |
|---|-----------|-----------------|-------|
| 1 | `triple-AND: color chip + measure dropdown + name search` | Select Completed chip + select AWV measure + type name → only matching rows visible | Admin |
| 2 | `quadruple combination: insurance + color + measure + search` | Hill (default) + Overdue chip + specific measure + name → correct subset | Admin |
| 3 | `filter dimension preservation: changing one filter preserves others` | Set measure → set color → type search → change insurance → verify all 3 prior filters still active | Admin |
| 4 | `empty result set from combined filters shows zero rows` | Apply restrictive combination yielding 0 rows → grid empty + "Showing 0 of Y rows" | Admin |
| 5 | `Duplicates + measure + search triple-AND` | Select Duplicates chip + specific measure + name → only duplicate rows matching both | Admin |
| 6 | `filter summary shows all active dimensions` | Insurance (non-All) + color chip + measure → status bar shows combined summary text | Admin |
| 7 | `combined filters as Staff (fewer patients)` | Login as staff1 → apply color + measure filters → verify counts reflect Staff patient set | Staff |
| 8 | `Staff filter counts differ from Admin for same filter combination` | Compare Completed count: Admin sees all, Staff sees only assigned physician's patients | Staff |

**Implementation pattern:**
```typescript
it('triple-AND: color chip + measure dropdown + name search', () => {
  cy.login('admin@gmail.com', 'welcome100');
  cy.waitForAgGrid();

  // Select Completed (green) chip
  cy.contains('button', 'Completed').click();
  cy.wait(300);

  // Select specific measure
  cy.get('[aria-label="Filter by quality measure"]').select('Annual Wellness Visit');
  cy.wait(300);

  // Type a name
  cy.get('[aria-label="Search patients by name"]').type('Smith');
  cy.wait(300);

  // Verify filtered results: all visible rows should have AWV completed + name contains "Smith"
  cy.get('.ag-center-cols-container .ag-row').each(($row) => {
    cy.wrap($row).find('[col-id="qualityMeasure"]').should('contain.text', 'Annual Wellness Visit');
    cy.wrap($row).find('[col-id="memberName"]').invoke('text').should('match', /smith/i);
    cy.wrap($row).should('have.class', 'row-status-green');
  });
});
```

---

### Tier 2 — Should Have (20 tests)

#### T2-1: Filter Chip Count After Cell Edits (6 Cypress tests)

**Gap:** Chip counts may become stale after inline edits change a row's status color. No E2E test verifies counts update correctly.

**Spec refs:** REQ-M7-2, GAP-2.2, GAP-2.3

**File:** `frontend/cypress/e2e/combined-filters.cy.ts` (extend, same file as T1-1)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `chip count updates after status edit changes row color` | Note Completed count → edit a row from Completed to In Progress → Completed count decreases by 1, In Progress increases by 1 |
| 2 | `chip count updates after adding a new row` | Note Not Addressed (white) count → add row → count increases by 1 |
| 3 | `chip count updates after deleting a row` | Note count → delete row → count decreases by 1 |
| 4 | `zero-count chip shows dashed border` | Select a measure where one color has 0 rows → verify dashed border styling |
| 5 | `clicking zero-count chip shows empty grid` | Click a (0) chip → grid shows no rows |
| 6 | `chip count with specific measure scope` | Select measure → verify each chip count ≤ "All" count |

---

#### T2-2: Sort + Filter Preservation (8 Cypress tests)

**Gap:** Users report losing sort order after applying filters.

**Spec refs:** REQ-M7-7, GAP-7.5, GAP-7.6

**File:** `frontend/cypress/e2e/sort-filter-interaction.cy.ts` (new)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `sort preserved when color filter applied` | Sort by Member Name → apply Completed filter → filtered rows maintain sort order |
| 2 | `sort preserved when measure filter applied` | Sort by Status Date → select measure → filtered rows maintain sort order |
| 3 | `filter preserved when sort applied` | Apply Overdue filter → sort by Due Date → filter still active |
| 4 | `sort + filter preserved after cell edit` | Sort + filter active → edit a cell → both sort and filter preserved after save |
| 5 | `filter state reset on navigation away and back` | Apply filters → navigate to import → navigate back → all filters reset to defaults |
| 6 | `insurance filter preserved when physician selector changes` | Set insurance to "All" → change physician dropdown → insurance still "All" |
| 7 | `pinned row visible despite filter mismatch` | Add row (creates pin) → select measure that doesn't match → pinned row still visible |
| 8 | `filter change clears pinned row badge` | Add row (pinned badge) → change color filter → pinned badge disappears |

---

#### T2-3: Combined Filters Per Role (6 Cypress tests)

**Gap:** Staff sees fewer patients than Admin due to physician scoping. Filter counts should reflect this.

**Spec refs:** REQ-M7-6, GAP-6.1 (role variant)

**File:** `frontend/cypress/e2e/combined-filters-roles.cy.ts` (new)

| # | Test Name | What It Verifies | Role |
|---|-----------|-----------------|------|
| 1 | `Staff "All" chip count reflects assigned physician only` | Login staff1 → "All" count ≤ admin "All" count | Staff |
| 2 | `Staff Completed chip count differs from Admin` | Staff Completed count reflects only their physician's completed rows | Staff |
| 3 | `Staff combined filter (color + measure) shows correct subset` | Staff applies Overdue + AWV → sees only overdue AWV rows for assigned physician | Staff |
| 4 | `Admin "All" chip count reflects all patients` | Login admin → "All" count equals total patients across all physicians | Admin |
| 5 | `Admin filter counts with unassigned patients` | Select "Unassigned" physician → verify chip counts reflect unassigned patients only | Admin |
| 6 | `Physician filter counts reflect own patients only` | Login phy1 → chip counts match phy1's patient set, not total | Physician |

---

### Tier 3 — Nice to Have (7 tests)

| # | Test Name | Framework | Spec Ref |
|---|-----------|-----------|----------|
| 1 | `narrow viewport (1024px) filter bar wraps without overflow` | Playwright | GAP-9.1 |
| 2 | `1280px viewport all 10 chips fit without overflow` | Playwright | GAP-9.2 |
| 3 | `full Tab order through chips → measure → insurance → search` | Playwright | GAP-10.1 |
| 4 | `keyboard-only dropdown operation (Enter, Arrow, Escape)` | Playwright | GAP-10.2 |
| 5 | `multi-word search E2E ("williams robert" finds "Williams, Robert")` | Cypress | GAP-4.1 |
| 6 | `search with extra whitespace works correctly` | Cypress | GAP-4.3 |
| 7 | `search text preserved when color filter changes` | Cypress | GAP-4.4 |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `frontend/cypress/e2e/combined-filters.cy.ts` | New | 14 | TODO |
| `frontend/cypress/e2e/sort-filter-interaction.cy.ts` | New | 8 | TODO |
| `frontend/cypress/e2e/combined-filters-roles.cy.ts` | New | 6 | TODO |
| **Total (T1+T2)** | | **28** | |
| **Total (T1+T2+T3)** | | **35** | |

---

## Done Criteria

- [ ] All 28+ tests written and passing (35 if Tier 3 included)
- [ ] No regressions in existing M7 tests (~326 baseline)
- [ ] Combined filters (3-4 dimensions) verified E2E
- [ ] Filter counts verified correct after cell edits, add/delete
- [ ] Sort + filter preservation confirmed
- [ ] Per-role filter counts differ correctly (Staff < Admin)
- [ ] Full 4-layer pyramid passes
