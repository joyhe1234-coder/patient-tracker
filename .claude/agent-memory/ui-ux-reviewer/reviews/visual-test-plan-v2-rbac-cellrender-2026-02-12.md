# Visual Test Plan v2.1 Execution Report
**Date:** 2026-02-12
**URL:** http://localhost (Docker via nginx)
**Sections Executed:** B (RBAC) + A (Cell Rendering)

---

## Phase 1: Section B -- RBAC Testing (4 Roles)

### B.1 ADMIN (admin@gmail.com / welcome100)

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| RBAC-1.1 | Login redirects to `/`, physician selector visible, Admin link visible | PASS | |
| RBAC-1.2 | Sees all physicians: Unassigned, Joy He, Ko Admin-Phy, Physician One | PASS | 4 options in dropdown |
| RBAC-1.3 | Grid requires manual physician selection before loading | DEVIATION | Grid auto-selects "Joy He" (42 patients) instead of showing blank prompt |
| RBAC-1.4 | Select Physician One -- grid loads with patients | PASS | 130 patients loaded |
| RBAC-1.6 | Select Ko Admin-Phy -- sees their patients | PASS | 20 patients loaded |
| RBAC-1.7 | Select "Unassigned patients" -- sees unassigned | PASS | 9 rows loaded |
| RBAC-1.10 | Admin link visible in header | PASS | |
| RBAC-1.11 | Admin page loads with Users and Audit Log tabs | PASS | 7 users in table |

**DEVIATION:** RBAC-1.3 -- ADMIN auto-loads "Joy He" on login. The page guide says STAFF/ADMIN should see "Select a Physician" prompt. The app instead auto-selects the first physician. This may be intentional (persisted selection in localStorage key `selectedPhysicianId`).

**DATA NOTE:** Physician One shows 120 patients in Admin Dashboard users table but 130 in the grid (10 row discrepancy -- possibly duplicate rows counted differently by the admin stats endpoint).

**Screenshot:** `section-b-rbac-admin-1-login.png`, `section-b-rbac-admin-2-physician-one.png`, `section-b-rbac-admin-3-unassigned.png`, `section-b-rbac-admin-4-admin-page.png`

---

### B.2 ADMIN+PHYSICIAN (ko037291@gmail.com / welcome100)

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| RBAC-2.1 | Physician selector visible, Admin link visible | PASS | |
| RBAC-2.2 | Auto-selects Joy He (same as pure ADMIN) | PASS | Consistent with ADMIN behavior |
| RBAC-2.3 | Sees all physicians + Unassigned | PASS | |
| RBAC-2.4 | Own patients (Ko Admin-Phy) = 20 rows | PASS | |
| RBAC-2.9 | Shows "(ADMIN + PHYSICIAN)" dual role badge | PASS | |
| RBAC-2.10 | Admin link visible | PASS | |

**Screenshot:** `section-b-rbac-admin-phy-1-login.png`

---

### B.3 PHYSICIAN (phy1@gmail.com / welcome100)

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| RBAC-3.1 | Grid auto-loads immediately, no physician selector | PASS | |
| RBAC-3.2 | Shows own patients only | PASS | 130 rows |
| RBAC-3.3 | NO physician selector dropdown | PASS | |
| RBAC-3.4 | NO Admin link in header | PASS | |
| RBAC-3.5 | Navigate to /admin -- redirects to / | PASS | |
| RBAC-3.9 | No "Unassigned patients" option | PASS | No dropdown at all |
| RBAC-3.10 | Row counts match filter chip totals | PASS | |

**Screenshot:** `section-b-rbac-physician-1-login.png`

---

### B.4 STAFF (staff1@gmail.com / welcome100)

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| RBAC-4.1 | Physician selector visible with "Viewing as:" label, no Admin link | PASS | |
| RBAC-4.2 | Only assigned physicians in dropdown (Physician One, Ko Admin-Phy) | PASS | 2 options |
| RBAC-4.3 | No "Unassigned patients" option | PASS | |
| RBAC-4.4 | "Joy He" NOT in dropdown list | PASS | Not assigned |
| RBAC-4.5 | Select Physician One -- loads 130 patients | PASS | |
| RBAC-4.7 | No Admin link in header | PASS | |

**Screenshot:** `section-b-rbac-staff-1-login.png`

---

### RBAC Summary

| Role | Tests | Pass | Fail | Deviation | Notes |
|------|-------|------|------|-----------|-------|
| ADMIN | 8 | 7 | 0 | 1 | Auto-selects physician instead of blank |
| ADMIN+PHYSICIAN | 6 | 6 | 0 | 0 | Dual role badge displays correctly |
| PHYSICIAN | 7 | 7 | 0 | 0 | Clean isolation |
| STAFF | 6 | 6 | 0 | 0 | Only sees assigned physicians |
| **TOTAL** | **27** | **26** | **0** | **1** | |

---

## Phase 2: Section A -- Cell Rendering (CELL-1 through CELL-10)

Tested while logged in as Staff One (STAFF) viewing Physician One's 130 patients.

| Test ID | Description | Result | Evidence |
|---------|-------------|--------|----------|
| CELL-1 | All default columns render readable text, no raw HTML | PASS | Verified via snapshot: Request Type, Member Name, Quality Measure, Measure Status, Status Date, Tracking #1/#2/#3, Due Date, Time Interval, Notes -- all render clean text |
| CELL-2 | Member Info toggle reveals DOB, Telephone, Address columns | PASS | Clicked "Member Info" button -- 3 new columns appeared: Member DOB, Member Telephone, Member Home Address |
| CELL-3 | DOB masked as "###", not raw HTML like `<span aria-l...` | PASS | All DOB cells show "###" as plain text. No HTML tags visible. |
| CELL-4 | Empty cells show blank, not "null" or "undefined" | PASS | Programmatic scan of all visible cells found zero instances of "null", "undefined", or "NaN" text |
| CELL-5 | Status Date prompt text in gray italic for empty cells with status | SKIP | No test data exists with a measure status AND empty status date. All 17 dateless rows are "Not Addressed" (no prompt). All other statuses already have dates. StatusDateRenderer component is correctly wired (line 629 of PatientGrid.tsx) and unit-tested. |
| CELL-6 | N/A tracking cells show "N/A" with diagonal stripe background | PASS | Verified `.cell-disabled` class with `repeating-linear-gradient` background on Tracking #1 and #2 cells. 10+ cells confirmed. |
| CELL-7 | Dropdown cells show hover-reveal arrow on hover | PASS | Tested on Request Type (AWV), Quality Measure (Annual Wellness Visit), and Measure Status (Not Addressed). All show `down triangle` arrow on hover. |
| CELL-8 | Notes column renders plain text, no HTML | PASS | All 23 visible notes cells contain plain text (e.g., "Status: Not Addressed", "Status: AWV completed | Due: 2026-11-19"). innerHTML has no unexpected tags. |
| CELL-9 | Due Date and Status Date render as M/D/YYYY format | PASS | Regex validation `/^\d{1,2}\/\d{1,2}\/\d{4}$/` passed for all non-empty date cells. Samples: "12/19/2025", "2/26/2026", "11/19/2025" |
| CELL-10 | Time Interval renders as plain number | PASS | Regex validation `/^\d+$/` passed for all non-empty interval cells. Samples: "7", "1", "365", "30" |

### Cell Rendering Summary

| Tests | Pass | Fail | Skip |
|-------|------|------|------|
| 10 | 9 | 0 | 1 |

**CELL-5 Skip Rationale:** The StatusDateRenderer component is correctly implemented and wired into the grid column definition at line 629. The component shows a prompt when `data.statusDatePrompt` is truthy and `value` (statusDate) is falsy. However, the seed data has zero rows where both conditions are met -- every row with a meaningful measure status already has a status date filled in, and the 17 "Not Addressed" rows have `statusDatePrompt: null`. This test requires either manual data manipulation or a dedicated test fixture.

---

## Screenshots Captured

| File | Description |
|------|-------------|
| section-b-rbac-admin-1-login.png | ADMIN login, Joy He auto-selected, 42 patients |
| section-b-rbac-admin-2-physician-one.png | ADMIN viewing Physician One, 130 patients |
| section-b-rbac-admin-3-unassigned.png | ADMIN viewing Unassigned, 9 patients |
| section-b-rbac-admin-4-admin-page.png | Admin Dashboard with Users table |
| section-b-rbac-admin-phy-1-login.png | ADMIN+PHYSICIAN login, Joy He auto-selected |
| section-b-rbac-physician-1-login.png | PHYSICIAN login, no selector, 130 patients |
| section-b-rbac-staff-1-login.png | STAFF login, Ko Admin-Phy selected, 20 patients |
| section-a-cell-1-default-columns.png | Full grid with 130 rows, all columns readable |
| section-a-cell-2-member-info-toggle.png | Member Info ON: DOB (###), Phone, Address visible |
| section-a-cell-4-6-empty-na-cells.png | Empty cells blank, N/A cells with stripes |
| section-a-cell-7-hover-arrow.png | Hover arrow on Request Type dropdown cell |

---

## Overall Results

| Phase | Section | Total Tests | Pass | Fail | Deviation | Skip |
|-------|---------|-------------|------|------|-----------|------|
| 1 | B: RBAC | 27 | 26 | 0 | 1 | 0 |
| 2 | A: Cell Rendering | 10 | 9 | 0 | 0 | 1 |
| **TOTAL** | | **37** | **35** | **0** | **1** | **1** |

### Issues Found

1. **DEVIATION (Low):** ADMIN/ADMIN+PHYSICIAN auto-selects first physician on login instead of showing "Select a Physician" prompt. Likely due to `selectedPhysicianId` being persisted in localStorage. Not a bug per se, but differs from the page guide expectation.

2. **DATA NOTE (Info):** Physician One shows 120 patients in Admin Dashboard but 130 in the patient grid. The 10-row difference may be caused by duplicate rows being counted differently or a stats calculation discrepancy in the admin endpoint.

3. **UNTESTABLE (Info):** CELL-5 Status Date prompts cannot be verified with current seed data. Would need a test fixture with a row that has a measure status set (e.g., "AWV scheduled") but an empty status date.
