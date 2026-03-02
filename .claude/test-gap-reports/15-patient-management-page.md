# Test Gap Analysis: R15 - Patient Management Page

**Date:** 2026-03-02
**Spec:** `.claude/specs/patient-management/requirements.md`
**Source:** `frontend/src/pages/PatientManagementPage.tsx` (88 lines)
**Regression Plan:** Section 32

## Test Inventory

| Framework | File | Test Count |
|-----------|------|------------|
| Vitest | `frontend/src/pages/PatientManagementPage.test.tsx` | 33 |
| Playwright | `frontend/e2e/patient-management.spec.ts` | 9 |
| **Total** | | **42** |

---

## Use Case Coverage Matrix

### UC-1: Tab Visibility by Role

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| ADMIN sees Import + Reassign + Bulk Ops tabs | R1-AC5 | YES (3 tests: ADMIN, ADMIN+PHYSICIAN, Bulk Ops ADMIN) | YES (1 test) | COVERED |
| PHYSICIAN sees Import tab only | R1-AC6 | YES (1 test) | YES (1 test) | COVERED |
| STAFF sees Import tab only | R1-AC6 | YES (1 test) | -- | COVERED |
| ADMIN+PHYSICIAN combo sees all tabs | -- | YES (1 test) | -- | COVERED |
| STAFF does NOT see Reassign tab | R1-AC6 | YES (1 test) | -- | COVERED |
| STAFF does NOT see Bulk Ops tab | -- | YES (1 test) | -- | COVERED |
| PHYSICIAN does NOT see Bulk Ops tab | -- | YES (1 test) | -- | COVERED |

### UC-2: URL Param Handling (?tab=)

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| ?tab=import shows Import tab (default) | R5-AC4 | YES (implicit - no param = import) | YES (1 test) | COVERED |
| ?tab=reassign activates Reassign for ADMIN | R5-AC3 | YES (1 test) | -- | COVERED |
| ?tab=reassign for ADMIN+PHYSICIAN | R5-AC3 | YES (1 test) | -- | COVERED |
| ?tab=reassign falls back for STAFF | R5-AC5 | YES (1 test) | -- | COVERED |
| ?tab=reassign falls back for PHYSICIAN | R5-AC5 | YES (1 test) | YES (1 test) | COVERED |
| ?tab=invalid falls back to Import | R5-AC6 | YES (1 test) | -- | COVERED |
| ?tab=bulk-ops activates Bulk Ops for ADMIN | -- | YES (1 test) | -- | COVERED |
| ?tab=bulk-ops falls back for STAFF | -- | YES (1 test) | -- | COVERED |
| ?tab=bulk-ops falls back for PHYSICIAN | -- | YES (1 test) | -- | COVERED |

### UC-3: Tab Switching

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Click Reassign shows reassign content | R1-AC3 | YES (1 test) | YES (1 test, URL check) | COVERED |
| Click Import after switch shows import content | R1-AC4 | YES (1 test) | -- | COVERED |
| isActive=true passed to ReassignTabContent | R4-AC6 | YES (1 test) | -- | COVERED |
| isActive=false passed when Import active | R4-AC6 | YES (1 test) | -- | COVERED |
| Click Bulk Ops shows bulk-ops content | -- | YES (1 test) | -- | COVERED |
| isActive=true passed to BulkOperationsTab | -- | YES (1 test) | -- | COVERED |
| isActive=false passed to BulkOperationsTab | -- | YES (1 test) | -- | COVERED |

### UC-4: Tab Content Mounting (State Preservation)

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Import tab always rendered in DOM | NFR-Perf | YES (1 test) | -- | COVERED |
| Reassign tab rendered for ADMIN | NFR-Perf | YES (1 test) | -- | COVERED |
| Reassign tab NOT rendered for non-ADMIN | NFR-Security | YES (1 test) | -- | COVERED |
| Reassign tab rendered for ADMIN+PHYSICIAN | -- | YES (1 test) | -- | COVERED |
| Bulk Ops tab rendered for ADMIN | -- | YES (1 test) | -- | COVERED |
| Bulk Ops tab NOT rendered for non-ADMIN | -- | YES (1 test) | -- | COVERED |

### UC-5: Page Structure

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Page heading "Patient Management" | R1-AC1 | YES (1 test) | YES (1 test) | COVERED |
| Page icon (blue container) | -- | YES (1 test) | -- | COVERED |
| Import tab styled as active by default | R1-AC2 | YES (1 test) | -- | COVERED |

### UC-6: Document Title

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Title "Patient Management - Import" | NFR-Usability | -- | -- | **GAP** |
| Title "Patient Management - Reassign" | NFR-Usability | -- | -- | **GAP** |
| Title "Patient Management - Bulk Operations" | -- | YES (1 test) | -- | PARTIAL |

### UC-7: Redirects (Old URLs)

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| /import redirects to /patient-management | R2-AC3 | -- | YES (1 test) | COVERED |
| /admin/patient-assignment redirects to ?tab=reassign | R2-AC4 | -- | YES (1 test) | COVERED |

### UC-8: Navigation

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Header shows "Patient Mgmt" nav link | R2-AC1 | -- | YES (1 test) | COVERED |
| "Patient Mgmt" highlights when on page | R2-AC2 | -- | YES (1 test) | COVERED |

### UC-9: Non-Admin Direct URL Access

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Non-admin accessing ?tab=bulk-ops URL (redirects to import) | R4-AC7 | YES (2 tests - STAFF, PHYSICIAN) | -- | COVERED |
| Non-admin accessing ?tab=reassign URL (redirects to import) | R4-AC7 | YES (2 tests - STAFF, PHYSICIAN) | YES (1 test) | COVERED |

### UC-10: Tab Content Lazy Loading

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| ReassignTabContent lazy-loads data on first activation | NFR-Perf | -- (tested in PatientAssignmentPage.test.tsx) | -- | COVERED (cross-file) |
| BulkOperationsTab lazy-loads data on first activation | -- | -- | -- | **GAP** (only in BulkOpsTab tests) |

### UC-11: Mobile/Responsive Tab Layout

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| Tab layout responsive on mobile | NFR-Usability | -- | -- | **GAP** |

### UC-12: Deep Linking

| Use Case | Spec Req | Vitest | Playwright | Status |
|----------|----------|--------|------------|--------|
| URL with ?tab=reassign opens Reassign directly | R5-AC3 | YES (1 test) | -- | COVERED |
| URL with ?tab=bulk-ops opens Bulk Ops directly | -- | YES (1 test) | -- | COVERED |
| Shared/bookmarked URL loads correct tab | R5-AC3 | YES (implicit) | -- | COVERED |

---

## Identified Gaps

### GAP-15.1: Document Title for Import and Reassign Tabs (Priority: LOW)
**Missing Test:** No test verifies `document.title` is set to "Patient Management - Import" or "Patient Management - Reassign".
**Note:** Bulk Ops title IS tested. The implementation handles all three in the same `useEffect`, so this is low risk, but completeness requires testing all three.
**Files to add to:** `PatientManagementPage.test.tsx`

### GAP-15.2: Mobile/Responsive Tab Layout (Priority: LOW)
**Missing Test:** No test verifies that tabs render correctly on mobile/narrow viewports.
**Note:** The current implementation uses `flex gap-8` for the tab bar without explicit responsive breakpoints. Visual verification via MCP Playwright or Cypress viewport tests would be ideal.
**Files to add to:** `patient-management.spec.ts` or visual review

### GAP-15.3: Tab Switching Preserves Import Form State (Priority: MEDIUM)
**Missing Test:** No test verifies that switching from Import to Reassign and back preserves the import form state (file selection, mode, physician selection).
**Note:** The implementation uses `display:none` (via `tab-hidden`/`tab-visible` CSS classes) to keep both tabs mounted, which should preserve state. However, no test actually fills in the import form, switches tabs, and verifies the form state is preserved.
**Files to add to:** `PatientManagementPage.test.tsx` (would need to not mock ImportTabContent)

### GAP-15.4: STAFF Accessing Reassign Tab - E2E (Priority: LOW)
**Missing Test:** No Playwright E2E test for STAFF user accessing the page (only PHYSICIAN tested in E2E).
**Note:** Vitest covers STAFF role. A STAFF E2E test would require STAFF credentials in seed data.
**Files to add to:** `patient-management.spec.ts`

---

## Gap Summary

| Gap ID | Description | Priority | Effort |
|--------|-------------|----------|--------|
| GAP-15.1 | Document title tests for Import/Reassign tabs | LOW | 10 min |
| GAP-15.2 | Mobile/responsive tab layout test | LOW | 30 min |
| GAP-15.3 | Tab switching preserves import form state | MEDIUM | 45 min |
| GAP-15.4 | STAFF E2E test for page access | LOW | 20 min |

## Coverage Assessment

**Overall Coverage: 90%** -- Very well covered. The core tab visibility, URL sync, role-based access, redirects, and content mounting are all thoroughly tested across Vitest and Playwright. The gaps are minor edge cases (document title completeness, responsive layout, form state preservation across tab switches). The spec has evolved beyond the original requirements to include a Bulk Operations tab, and this is also well-tested.

**Spec vs. Implementation Drift:** The original spec (R1-R5) does not mention a "Bulk Operations" tab, but the implementation and tests include it. All 3 tabs are tested. This is an additive enhancement, not a regression.
