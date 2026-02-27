# M4 Import Pipeline — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.4
**Spec:** `.claude/specs/test-import-pipeline/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| Backend import services | Jest | ~832 | fileParser, columnMapper, dataTransformer, validator, configLoader, errorReporter, diffCalculator, reassignment, integration, fuzzyMatcher, conflictDetector, mappingService |
| Backend import routes | Jest | ~94 | import.routes (52), mapping.routes (42) |
| Frontend import components | Vitest | ~276 | ImportPage, ImportPreviewPage, SheetSelector, ConflictBanner, ConflictResolutionStep, MappingTable, ActionPatternTable, MappingManagementPage, PreviewChangesTable, PreviewSummaryCards, UnmappedActionsBanner, ImportResultsDisplay |
| Playwright E2E | Playwright | ~86 | import-all-roles (13), sutter-import-visual (22), sutter-import-edge-cases, sutter-import-errors, smart-column-mapping |
| Cypress E2E | Cypress | ~71 | import-flow (48), import-conflict-admin (8), import-conflict-nonadmin (6), mapping-management (9) |
| **Total** | | **~1,359** | |

This is the most comprehensively tested module. The gap remediation is focused and narrow.

---

## Planned New Tests (~14 tests)

### Tier 1 — Must Have (6 tests)

#### T1-1: Non-Admin Import Conflict Flow (6 Playwright tests)

**Gap:** The conflict resolution UI has different behavior per role: Admin gets an interactive form (ConflictResolutionStep), while Physician and Staff get a read-only banner (ConflictBanner). The Admin flow is tested in `import-conflict-admin.cy.ts` (8 Cypress tests), but Physician and Staff conflict resolution flows are tested only partially via `import-all-roles.spec.ts`.

**Spec refs:** Execution plan item #11, cross-cutting role behavior

**File:** `frontend/e2e/import-all-roles.spec.ts` (extend existing)

| # | Test Name | What It Verifies | Role |
|---|-----------|-----------------|------|
| 1 | `Physician sees read-only conflict banner (not interactive form)` | Upload file with conflicts as Physician → ConflictBanner renders, no dropdowns | Physician |
| 2 | `Physician conflict banner shows "contact your administrator" message` | Banner text includes admin contact instruction | Physician |
| 3 | `Physician can cancel import with conflicts` | Cancel button on conflict banner works | Physician |
| 4 | `Staff sees read-only conflict banner` | Upload file with conflicts as Staff → ConflictBanner renders | Staff |
| 5 | `Staff conflict banner "Copy Details" copies to clipboard` | Copy Details button functional | Staff |
| 6 | `Admin sees interactive conflict resolution form` | Upload same file as Admin → ConflictResolutionStep renders with dropdowns | Admin |

**Implementation pattern:**
```typescript
test('Physician sees read-only conflict banner', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.login('phy1@gmail.com', 'welcome100');
  // Navigate to import, upload file that triggers conflicts
  await page.goto('/import');
  // ... upload file with known conflicts ...
  // Verify banner (not interactive form)
  await expect(page.getByText('contact your administrator')).toBeVisible();
  await expect(page.getByRole('combobox')).not.toBeVisible(); // No dropdowns
});
```

---

### Tier 2 — Should Have (8 tests)

#### T2-1: Import Conflict Detection Edge Cases (8 Jest tests)

**Gap:** The conflictDetector service has comprehensive tests, but the spec identifies edge cases around Hill vs Sutter parser differences and fuzzy matching accuracy for near-miss column names.

**Spec refs:** Execution plan item #17

**File:** `backend/src/services/import/__tests__/conflictDetector.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `Hill file with renamed column detects RENAMED conflict` | Column "Member Name" → "Patient Name" classified as RENAMED |
| 2 | `Hill file with missing required column detects MISSING conflict` | "Member DOB" column absent → MISSING severity=error |
| 3 | `Sutter file with extra non-mapped column produces no conflict` | Unknown columns are silently ignored |
| 4 | `Sutter file with duplicate column names detects DUPLICATE conflict` | Two columns named "Action" → DUPLICATE |
| 5 | `Fuzzy match threshold: 85% similarity triggers RENAMED` | "Mammogram" vs "Mammogram screening" → fuzzy match |
| 6 | `Fuzzy match below threshold: 60% similarity triggers MISSING` | "Weight" vs "Mammogram" → no fuzzy match, MISSING |
| 7 | `Wrong-file detection: Hill file uploaded as Sutter` | Dual-ratio check identifies cross-system mismatch |
| 8 | `Empty file (headers only) produces NO_DATA_ROWS error` | Zero data rows after header → descriptive error |

---

## Tests NOT Planned (Deferred to Tier 3)

| Gap | Reason Deferred |
|-----|----------------|
| Import fuzzy matching accuracy (all fuzzy strategies) | ~800 import tests already exist; diminishing returns |
| Import rollback on partial failure | Defensive scenario, not user-reported |
| Password-protected Excel handling | Edge case, existing error handler covers gracefully |
| 10+ sheet performance test | Non-functional, hard to assert reliably |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `frontend/e2e/import-all-roles.spec.ts` | Extend | +6 | TODO |
| `backend/src/services/import/__tests__/conflictDetector.test.ts` | Extend | +8 | TODO |
| **Total** | | **14** | |

---

## Done Criteria

- [ ] All 14 tests written and passing
- [ ] No regressions in existing M4 tests (~1,359 baseline)
- [ ] Non-admin conflict flow verified: Physician + Staff see read-only banner, Admin sees interactive form
- [ ] Hill + Sutter conflict detection edge cases covered
- [ ] Full 4-layer pyramid passes
