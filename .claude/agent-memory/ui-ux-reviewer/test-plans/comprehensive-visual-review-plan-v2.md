# Comprehensive Visual Review Test Plan v2.1

**Updated:** February 12, 2026
**Scope:** Full application — all pages, all roles, all quality measure/status combos, row colors, search, sorting, role-based access
**Total Test Cases:** ~427
**Changelog:** v2.1 — Fixed 3 color errors: QM-1.6 "Will call later" Yellow→Blue, QM-13.2 "Chronic diagnosis confirmed" Orange→Green, OVR-5 "Red does NOT override green"→"Red DOES override green". Added 4 new sections (H: Toast, I: Duplicates, J: Keyboard, K: HgbA1c Goals). Added execution infrastructure (test environment, common procedures, screenshot naming, row color verification).

---

## Test Environment

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost` (Docker via nginx) or `http://localhost:5173` (Vite dev) |
| Browser | Chromium (MCP Playwright default) |
| Resolution | 1280x800 minimum |
| Prerequisites | Docker containers running (`docker compose up -d`), config tables seeded (`npx tsx prisma/seed.ts`) |

## Common Procedures

### Login
1. Navigate to `{BASE_URL}/login`
2. Fill email field, fill password field
3. Click "Sign In"
4. Wait for redirect to `/`

### Logout
1. Click user icon (top-right)
2. Click "Logout"
3. Wait for redirect to `/login`

### Row Color Verification
Row colors are applied via CSS classes on `[row-index="N"]` elements:
- `row-status-green`, `row-status-blue`, `row-status-yellow`, `row-status-purple`, `row-status-orange`, `row-status-gray`, `row-status-overdue` (red)
- Use `browser_evaluate` with: `document.querySelector('[row-index="0"]').className`
- Or take screenshot and visually verify background color

### Screenshot Naming Convention
- `section-a-cell-{N}.png` (Cell Rendering)
- `section-b-rbac-{role}-{N}.png` (RBAC)
- `section-c-qm-{group}-{status}.png` (Quality Measure Matrix)
- `section-d-search-{N}.png`, `section-e-sort-{N}.png`, etc.

---

## Test Accounts

| ID | Role | Email | Password | Patients | Notes |
|----|------|-------|----------|----------|-------|
| U1 | ADMIN (pure) | `admin@gmail.com` | `welcome100` | 0 own | Can see everyone via selector, CANNOT take patients |
| U2 | ADMIN+PHYSICIAN | `ko037291@gmail.com` | `welcome100` | 20 | CAN take patients AND see all via selector |
| U3 | PHYSICIAN | `phy1@gmail.com` | `welcome100` | 130 | Sees only own patients, no selector |
| U4 | PHYSICIAN | `joyhe1234@gmail.com` | `welcome100` | 42 | Sees only own patients |
| U5 | STAFF | `staff1@gmail.com` | `welcome100` | 0 | Assigned to: phy1, ko037291 |
| U6 | STAFF | `staff2@gmail.com` | `welcome100` | 0 | Assigned to: phy1, joyhe1234, ko037291 |
| -- | Unassigned | -- | -- | 9 | Only visible to ADMIN |

---

## NEW Section A: Cell Rendering Integrity

> **Lesson learned:** DOB column showed raw HTML `<span aria-l...` instead of dates. Must verify ALL cells render data correctly.

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| CELL-1 | All default columns render data | Load grid with data, screenshot | Every cell shows readable text, no raw HTML tags, no `<span`, no `[object Object]` |
| CELL-2 | Member Info columns render after toggle | Click "Member Info" toggle ON | DOB shows masked dates (###), Telephone shows (555) format, Address shows text |
| CELL-3 | DOB column displays correctly | Toggle Member Info ON, scroll to DOB | All DOB cells show `###` masked values, no `<span aria-l...` |
| CELL-4 | Empty cells render blank | Find rows with null fields | Empty cells show blank or prompt text, not "null" or "undefined" |
| CELL-5 | Status Date prompt text renders | Find row with status but no date | Shows contextual prompt ("Date Completed", "Date Ordered", etc.) in gray italic |
| CELL-6 | N/A tracking cells render correctly | Find row where tracking is disabled | Shows "N/A" with gray diagonal stripe background, not raw text |
| CELL-7 | Dropdown cells show hover arrow | Hover over Request Type cell | Arrow indicator (▾) appears on hover, disappears on mouse-out |
| CELL-8 | Notes column renders long text | Find row with long notes | Text visible, not clipped (or shows ellipsis with tooltip) |
| CELL-9 | Due Date renders as date | Find row with calculated due date | Shows M/D/YYYY format, not ISO string or epoch |
| CELL-10 | Time Interval renders as number | Find row with interval | Shows plain number (e.g., "7"), not "7 days" or other formatting |

---

## NEW Section B: Role-Based Access Control (RBAC)

### B.1 ADMIN (Pure — No PHYSICIAN Role)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| RBAC-1.1 | ADMIN login | Login as `admin@gmail.com` | Redirects to `/`, physician selector visible, Admin nav link visible |
| RBAC-1.2 | ADMIN sees all physicians | Open physician selector dropdown | Lists ALL physicians: Ko Admin-Phy, Physician One, Joy He + "Unassigned patients" |
| RBAC-1.3 | ADMIN cannot take patients | Verify no "own patients" auto-load | Must select a physician from dropdown — no auto-load, no "my patients" |
| RBAC-1.4 | ADMIN views physician's patients | Select "Physician One" | Grid loads Physician One's 130 patients |
| RBAC-1.5 | ADMIN views different physician | Select "Joy He" | Grid loads Joy He's 42 patients |
| RBAC-1.6 | ADMIN views ADMIN+PHY's patients | Select "Ko Admin-Phy" | Grid loads Ko's 20 patients |
| RBAC-1.7 | ADMIN views unassigned | Select "Unassigned patients" | Grid loads 9 unassigned patient rows |
| RBAC-1.8 | ADMIN can edit unassigned | Select unassigned, edit a cell | Edit saves successfully |
| RBAC-1.9 | ADMIN can add row to unassigned | Select unassigned, click "Add Row" | Modal opens, row creates successfully |
| RBAC-1.10 | ADMIN sees Admin nav link | Check header | "Admin" link visible |
| RBAC-1.11 | ADMIN can access /admin | Click Admin link | Admin page loads with Users/Audit tabs |
| RBAC-1.12 | ADMIN filter chips show correct counts | Select Physician One, check filter bar | "All (130)" or similar, counts match actual data |

### B.2 ADMIN+PHYSICIAN (Dual Role)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| RBAC-2.1 | ADMIN+PHY login | Login as `ko037291@gmail.com` | Redirects to `/`, physician selector visible, Admin link visible |
| RBAC-2.2 | ADMIN+PHY auto-loads own patients | After login, check grid | Does NOT auto-load (has selector), or shows own 20 patients |
| RBAC-2.3 | ADMIN+PHY sees all physicians | Open physician selector | Lists ALL physicians including self + "Unassigned patients" |
| RBAC-2.4 | ADMIN+PHY can view own patients | Select self in dropdown | Grid shows own 20 patients |
| RBAC-2.5 | ADMIN+PHY can view others' patients | Select "Physician One" | Grid shows Physician One's 130 patients |
| RBAC-2.6 | ADMIN+PHY can view unassigned | Select "Unassigned patients" | Grid shows 9 unassigned rows |
| RBAC-2.7 | ADMIN+PHY can edit own patients | Select self, edit a cell | Saves successfully |
| RBAC-2.8 | ADMIN+PHY can edit others' patients | Select Physician One, edit a cell | Saves successfully (admin privilege) |
| RBAC-2.9 | ADMIN+PHY user menu shows dual role | Click user menu icon | Shows "(ADMIN + PHYSICIAN)" badge |
| RBAC-2.10 | ADMIN+PHY can access Admin page | Navigate to /admin | Admin page loads |

### B.3 PHYSICIAN (Pure)

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| RBAC-3.1 | PHYSICIAN login | Login as `phy1@gmail.com` | Redirects to `/`, NO physician selector, grid auto-loads |
| RBAC-3.2 | PHYSICIAN sees only own patients | Check grid | Shows exactly 130 rows (Physician One's patients) |
| RBAC-3.3 | PHYSICIAN no selector | Check header | No physician dropdown visible |
| RBAC-3.4 | PHYSICIAN no Admin link | Check header nav | No "Admin" link |
| RBAC-3.5 | PHYSICIAN cannot access /admin | Navigate to `/admin` directly in URL | Redirected to `/` or "Access Denied" |
| RBAC-3.6 | PHYSICIAN can edit own patients | Edit a cell | Saves successfully |
| RBAC-3.7 | PHYSICIAN can add row | Click "Add Row", fill fields | New row created |
| RBAC-3.8 | PHYSICIAN can delete row | Select row, click "Delete Row", confirm | Row deleted |
| RBAC-3.9 | PHYSICIAN cannot see unassigned | Check UI | No option to view unassigned patients |
| RBAC-3.10 | PHYSICIAN filter chips correct | Check filter bar | Counts reflect only own 130 patients |

### B.4 STAFF

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| RBAC-4.1 | STAFF login | Login as `staff1@gmail.com` | Redirects to `/`, physician selector visible, no Admin link |
| RBAC-4.2 | STAFF sees only assigned physicians | Open physician selector | Only "Physician One" and "Ko Admin-Phy" (staff1's assignments) |
| RBAC-4.3 | STAFF does NOT see unassigned | Check dropdown | No "Unassigned patients" option |
| RBAC-4.4 | STAFF does NOT see non-assigned physician | Check dropdown | "Joy He" NOT in list (not assigned to staff1) |
| RBAC-4.5 | STAFF selects assigned physician | Select "Physician One" | Grid loads 130 patients |
| RBAC-4.6 | STAFF can edit assigned physician's patients | Edit a cell | Saves successfully |
| RBAC-4.7 | STAFF no Admin link | Check header nav | No "Admin" link |
| RBAC-4.8 | STAFF cannot access /admin | Navigate to `/admin` | Redirected or Access Denied |
| RBAC-4.9 | STAFF2 sees different assignments | Login as `staff2@gmail.com`, open dropdown | Sees: Physician One, Joy He, Ko Admin-Phy (3 assignments) |
| RBAC-4.10 | STAFF filter chips correct | Select a physician, check filter bar | Counts match that physician's data |

---

## NEW Section C: Complete Quality Measure → Status Matrix

> **Every** quality measure, **every** status, fill **all** required fields, verify due date, row color, and filter chip counts.

### Setup for All Tests
- Login as ADMIN, select a physician with data
- Use "Add Row" or find existing row to test each combination
- After each status change: verify row color, due date, time interval, filter chip counts

### C.1 AWV → Annual Wellness Visit (7 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-1.1 | Not Addressed | (none needed) | None | White | Not Addressed |
| QM-1.2 | Patient called to schedule AWV | Status Date: 1/1/2026 | 1/8/2026 (7 days) | Overdue (Red) — past due | Overdue + In Progress |
| QM-1.2b | Patient called to schedule AWV | Status Date: today | Today + 7 days | Blue (In Progress) | In Progress |
| QM-1.2c | Patient called to schedule AWV | Status Date: today, manually change interval to 30 | Today + 30 days | Blue (In Progress) | In Progress |
| QM-1.3 | AWV scheduled | Status Date: today | Tomorrow (1 day) | Blue (In Progress) | In Progress |
| QM-1.4 | AWV completed | Status Date: today | Today + 365 days | Green (Completed) | Completed |
| QM-1.5 | Patient declined AWV | (no due date) | None | Purple (Declined) | Declined |
| QM-1.6 | Will call later to schedule | Status Date: 1/1/2026 | 1/31/2026 (30 days) | Overdue (Red) | Overdue + In Progress |
| QM-1.6b | Will call later to schedule | Status Date: today | Today + 30 days | Blue (In Progress) | In Progress |
| QM-1.7 | No longer applicable | (no due date) | None | Gray (N/A) | N/A |

### C.2 Screening → Breast Cancer Screening (8 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-2.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-2.2 | Screening discussed | Status Date: today, Tracking #1: "In 1 Month" | Today + ~30 days | Yellow (Contacted) | Contacted |
| QM-2.2b | Screening discussed | Status Date: today, Tracking #1: "In 6 Months" | Today + ~180 days | Yellow (Contacted) | Contacted |
| QM-2.2c | Screening discussed | Status Date: 6/1/2025, Tracking #1: "In 1 Month" | ~7/1/2025 | Overdue (Red) | Overdue |
| QM-2.2d | Screening discussed | Status Date: today, Tracking #1: "In 11 Months" | Today + ~330 days | Yellow (Contacted) | Contacted |
| QM-2.2e | Verify Time Interval is LOCKED | Try to edit Time Interval cell | Cell not editable (locked for dropdown-controlled statuses) | -- | -- |
| QM-2.3 | Screening test ordered | Status Date: today, Tracking #1: "Mammogram" | Today + 14 days | Blue (In Progress) | In Progress |
| QM-2.3b | Screening test ordered | Status Date: today, Tracking #1: "Breast Ultrasound" | Today + 14 days | Blue | In Progress |
| QM-2.3c | Screening test ordered | Status Date: today, Tracking #1: "Breast MRI" | Today + 21 days | Blue | In Progress |
| QM-2.4 | Screening test completed | Status Date: today | Today + 365 days | Green (Completed) | Completed |
| QM-2.5 | Obtaining outside records | Status Date: today | Today + 14 days | Blue (In Progress) | In Progress |
| QM-2.6 | Patient declined screening | (no due date) | None | Purple (Declined) | Declined |
| QM-2.7 | No longer applicable | (none) | None | Gray (N/A) | N/A |
| QM-2.8 | Screening unnecessary | (none) | None | Gray (N/A) | N/A |

### C.3 Screening → Colon Cancer Screening (8 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-3.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-3.2 | Screening discussed | Status Date: today, Tracking #1: "In 3 Months" | Today + ~90 days | Yellow | Contacted |
| QM-3.3 | Colon cancer screening ordered | Status Date: today, Tracking #1: "Colonoscopy" | Today + 42 days | Blue | In Progress |
| QM-3.3b | Colon cancer screening ordered | Status Date: today, Tracking #1: "Cologuard" | Today + 21 days | Blue | In Progress |
| QM-3.3c | Colon cancer screening ordered | Status Date: today, Tracking #1: "FOBT" | Today + 21 days | Blue | In Progress |
| QM-3.3d | Colon cancer screening ordered | Status Date: today, Tracking #1: "Sigmoidoscopy" | Today + 42 days | Blue | In Progress |
| QM-3.4 | Colon cancer screening completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-3.5 | Obtaining outside records | Status Date: today | Today + 14 days | Blue | In Progress |
| QM-3.6 | Patient declined screening | (none) | None | Purple | Declined |
| QM-3.7 | No longer applicable | (none) | None | Gray | N/A |
| QM-3.8 | Screening unnecessary | (none) | None | Gray | N/A |

### C.4 Screening → Cervical Cancer Screening (8 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-4.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-4.2 | Screening discussed | Status Date: today, Tracking #1: "In 2 Months" | Today + ~60 days | Yellow | Contacted |
| QM-4.3 | Screening appt made | Status Date: today | Today + 1 day | Blue | In Progress |
| QM-4.4 | Screening completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-4.5 | Obtaining outside records | Status Date: today | Today + 14 days | Blue | In Progress |
| QM-4.6 | Patient declined | (none) | None | Purple | Declined |
| QM-4.7 | No longer applicable | (none) | None | Gray | N/A |
| QM-4.8 | Screening unnecessary | (none) | None | Gray | N/A |

### C.5 Quality → Diabetic Eye Exam (8 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-5.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-5.2 | Diabetic eye exam discussed | Status Date: today | Today + 42 days | Yellow | Contacted |
| QM-5.3 | Diabetic eye exam referral made | Status Date: today | Today + 42 days | Blue | In Progress |
| QM-5.4 | Diabetic eye exam scheduled | Status Date: today | Today + 1 day | Blue | In Progress |
| QM-5.5 | Diabetic eye exam completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-5.6 | Obtaining outside records | Status Date: today | Today + 14 days | Blue | In Progress |
| QM-5.7 | Patient declined | (none) | None | Purple | Declined |
| QM-5.8 | No longer applicable | (none) | None | Gray | N/A |

### C.6 Quality → GC/Chlamydia Screening (6 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-6.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-6.2 | Patient contacted for screening | Status Date: today | Today + 10 days | Yellow | Contacted |
| QM-6.3 | Test ordered | Status Date: today | Today + 5 days | Blue | In Progress |
| QM-6.4 | GC/Clamydia screening completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-6.5 | Patient declined screening | (none) | None | Purple | Declined |
| QM-6.6 | No longer applicable | (none) | None | Gray | N/A |

### C.7 Quality → Diabetic Nephropathy (6 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-7.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-7.2 | Patient contacted for screening | Status Date: today | Today + 10 days | Yellow | Contacted |
| QM-7.3 | Urine microalbumin ordered | Status Date: today | Today + 5 days | Blue | In Progress |
| QM-7.4 | Urine microalbumin completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-7.5 | Patient declined screening | (none) | None | Purple | Declined |
| QM-7.6 | No longer applicable | (none) | None | Gray | N/A |

### C.8 Quality → Hypertension Management (7 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-8.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-8.2 | Blood pressure at goal | (no due date) | None | Green (Completed) | Completed |
| QM-8.3 | Scheduled call back - BP not at goal | Status Date: today, Tracking #1: "Call every 1 wk" | Today + 7 days | Blue | In Progress |
| QM-8.3b | Scheduled call back - BP not at goal | Status Date: today, Tracking #1: "Call every 4 wks" | Today + 28 days | Blue | In Progress |
| QM-8.3c | Scheduled call back - BP not at goal | Status Date: today, Tracking #1: "Call every 8 wks" | Today + 56 days | Blue | In Progress |
| QM-8.3d | Scheduled call back - BP not at goal | Status Date: 1/1/2026, Tracking #1: "Call every 1 wk" | 1/8/2026 | Overdue (Red) | Overdue |
| QM-8.3e | Verify Time Interval is LOCKED | Try to edit Time Interval | NOT editable (dropdown-controlled) | -- | -- |
| QM-8.3f | Verify Tracking #2 is text input for BP | Check Tracking #2 cell | Free text input (for BP reading like "130/80"), NOT dropdown | -- | -- |
| QM-8.4 | Scheduled call back - BP at goal | Status Date: today, Tracking #1: "Call every 2 wks" | Today + 14 days | Blue | In Progress |
| QM-8.4b | Scheduled call back - BP at goal | Status Date: today, Tracking #1: "Call every 6 wks" | Today + 42 days | Blue | In Progress |
| QM-8.5 | Appointment scheduled | Status Date: today | Today + 1 day | Blue | In Progress |
| QM-8.6 | Declined BP control | (none) | None | Purple | Declined |
| QM-8.7 | No longer applicable | (none) | None | Gray | N/A |

### C.9 Quality → ACE/ARB in DM or CAD (6 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-9.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-9.2 | Patient on ACE/ARB | (none) | None | Green (Completed) | Completed |
| QM-9.3 | ACE/ARB prescribed | Status Date: today | Today + 14 days | Blue | In Progress |
| QM-9.4 | Patient declined | (none) | None | Purple | Declined |
| QM-9.5 | Contraindicated | (none) | None | Purple | Declined |
| QM-9.6 | No longer applicable | (none) | None | Gray | N/A |

### C.10 Quality → Vaccination (6 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-10.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-10.2 | Vaccination discussed | Status Date: today | Today + 7 days | Yellow | Contacted |
| QM-10.3 | Vaccination scheduled | Status Date: today | Today + 1 day | Blue | In Progress |
| QM-10.4 | Vaccination completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-10.5 | Patient declined | (none) | None | Purple | Declined |
| QM-10.6 | No longer applicable | (none) | None | Gray | N/A |

### C.11 Quality → Diabetes Control (6 statuses — HgbA1c special tracking)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-11.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-11.2 | HgbA1c ordered | Status Date: today, Tracking #2: "3 months" | Today + ~90 days | Blue | In Progress |
| QM-11.2b | HgbA1c ordered | Status Date: today, Tracking #2: "6 months" | Today + ~180 days | Blue | In Progress |
| QM-11.2c | HgbA1c ordered | Status Date: today, Tracking #2: "12 months" | Today + ~365 days | Blue | In Progress |
| QM-11.2d | HgbA1c ordered | Status Date: today, no Tracking #2 | None (requires tracking2) | Blue | In Progress |
| QM-11.2e | Verify Tracking #2 is DROPDOWN for HgbA1c | Click Tracking #2 | Dropdown with 1-12 months options | -- | -- |
| QM-11.2f | Verify Tracking #1 shows HgbA1c prompt | Check Tracking #1 cell | Shows prompt text or is editable for HgbA1c value | -- | -- |
| QM-11.2g | Verify Time Interval is LOCKED | Try to edit Time Interval | NOT editable (dropdown-controlled) | -- | -- |
| QM-11.3 | HgbA1c at goal | Status Date: today, Tracking #2: "6 months" | Today + ~180 days | Green | Completed |
| QM-11.3b | HgbA1c at goal | Status Date: 6/1/2025, Tracking #2: "3 months" | ~9/1/2025 | Overdue (Red) | Overdue |
| QM-11.4 | HgbA1c NOT at goal | Status Date: today, Tracking #2: "3 months" | Today + ~90 days | Blue | In Progress |
| QM-11.5 | Patient declined | (none) | None | Purple | Declined |
| QM-11.6 | No longer applicable | (none) | None | Gray | N/A |

### C.12 Quality → Annual Serum K&Cr (5 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-12.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-12.2 | Lab ordered | Status Date: today | Today + 7 days | Blue | In Progress |
| QM-12.3 | Lab completed | Status Date: today | Today + 365 days | Green | Completed |
| QM-12.4 | Patient declined | (none) | None | Purple | Declined |
| QM-12.5 | No longer applicable | (none) | None | Gray | N/A |

### C.13 Chronic DX → Chronic Diagnosis Code (5 statuses)

| ID | Status | Fields to Fill | Expected Due Date | Expected Row Color | Filter Chip |
|----|--------|---------------|-------------------|-------------------|-------------|
| QM-13.1 | Not Addressed | (none) | None | White | Not Addressed |
| QM-13.2 | Chronic diagnosis confirmed | Status Date: today | Today + 365 days | Green (Completed) | Completed |
| QM-13.3 | Chronic diagnosis resolved | Status Date: today, Tracking #1: "Attestation not sent" | Today + 14 days | Orange | Resolved |
| QM-13.3b | Chronic diagnosis resolved | Status Date: today, Tracking #1: "Attestation sent" | None (or base) | Green (Completed) | Completed |
| QM-13.3c | Chronic diagnosis resolved | Status Date: 1/1/2026, Tracking #1: "Attestation not sent" | 1/15/2026 | Overdue (Red) | Overdue |
| QM-13.4 | Chronic diagnosis invalid | Status Date: today, Tracking #1: "Attestation not sent" | Today + 14 days | Orange | Resolved |
| QM-13.4b | Chronic diagnosis invalid | Status Date: today, Tracking #1: "Attestation sent" | None (or base) | Green (Completed) | Completed |
| QM-13.5 | No longer applicable | (none) | None | Gray | N/A |

### C.14 Manual Time Interval Override Tests

> For statuses where Time Interval IS editable (not dropdown-controlled).

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| QM-14.1 | Manual interval — AWV called | Set "Patient called to schedule AWV", Status Date: today, then edit Time Interval to 30 | Due Date = today + 30 days |
| QM-14.2 | Manual interval — AWV completed | Set "AWV completed", Status Date: today, edit interval to 180 | Due Date = today + 180 days |
| QM-14.3 | Manual interval — Test ordered | Set "Test ordered", Status Date: today, edit interval to 14 | Due Date = today + 14 days |
| QM-14.4 | Manual interval — revert to auto | After manual override, change tracking dropdown | Due Date recalculates from dropdown rule |
| QM-14.5 | Invalid interval — zero | Enter 0 in Time Interval | Validation error, value rejected |
| QM-14.6 | Invalid interval — negative | Enter -1 | Validation error |
| QM-14.7 | Invalid interval — too large | Enter 1001 | Validation error |
| QM-14.8 | Invalid interval — text | Enter "abc" | Validation error |

### C.15 Cascading Clear Verification

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| QM-15.1 | Change Request Type clears all | Set full row (RT, QM, MS, SD, T1, T2, T3), change Request Type | QM, MS, SD, T1, T2, T3, Due Date, Interval all clear. Notes preserved. |
| QM-15.2 | Change Quality Measure clears downstream | Set full row, change Quality Measure | MS, SD, T1, T2, T3, Due Date, Interval clear. RT preserved. |
| QM-15.3 | Change Measure Status clears downstream | Set full row, change Measure Status | SD, T1, T2, T3, Due Date, Interval clear. RT and QM preserved. |
| QM-15.4 | Notes NEVER cleared | Set notes, change Request Type | Notes field still has original text |
| QM-15.5 | Auto-fill QM for AWV | Select Request Type "AWV" | Quality Measure auto-fills "Annual Wellness Visit" |
| QM-15.6 | Auto-fill QM for Chronic DX | Select "Chronic DX" | Quality Measure auto-fills "Chronic Diagnosis Code" |
| QM-15.7 | No auto-fill for Quality | Select "Quality" | Quality Measure is blank (multiple options available) |
| QM-15.8 | No auto-fill for Screening | Select "Screening" | Quality Measure is blank (multiple options) |

---

## NEW Section D: Search Functionality

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| SRCH-1 | Search by full name | Type full member name (e.g., "Garcia, Rachel") | Only matching rows shown |
| SRCH-2 | Search by partial name | Type "Garc" | All rows with names containing "Garc" shown |
| SRCH-3 | Search case-insensitive | Type "garcia" (lowercase) | Still finds "Garcia, Rachel" |
| SRCH-4 | Search by first name | Type "Rachel" | Finds rows with "Rachel" in name |
| SRCH-5 | Search with no results | Type "ZZZZNONEXISTENT" | Grid shows 0 rows, status bar shows "Showing 0 of X rows" |
| SRCH-6 | Search + status filter | Select "Completed" filter, then type a name | AND logic: only completed rows matching name |
| SRCH-7 | Search clears with Escape | Type text, press Escape | Search clears, all rows return |
| SRCH-8 | Search clears with X button | Type text, click X icon in search | Text clears, all rows return |
| SRCH-9 | Ctrl+F focuses search | Press Ctrl+F | Search input gets focus (not browser find) |
| SRCH-10 | Status bar updates during search | Type a name | "Showing X of Y rows" updates live |
| SRCH-11 | Filter chip counts during search | Search for a name, check chips | Chip counts reflect FULL dataset (not search-filtered) |
| SRCH-12 | Search persists across filter changes | Type name, then click "Completed" chip | Search text preserved, results narrow further |

---

## NEW Section E: Sorting

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| SORT-1 | Sort Member Name ascending | Click "Member Name" header once | Arrow up indicator, rows sorted A→Z |
| SORT-2 | Sort Member Name descending | Click header again | Arrow down indicator, rows sorted Z→A |
| SORT-3 | Clear sort — third click | Click header third time | No arrow indicator, original row order |
| SORT-4 | Sort Request Type | Click "Request Type" header | Sorted alphabetically: AWV, Chronic DX, Quality, Screening |
| SORT-5 | Sort Quality Measure | Click header | Sorted alphabetically |
| SORT-6 | Sort Measure Status | Click header | Sorted alphabetically |
| SORT-7 | Sort Status Date | Click header | Dates sorted chronologically (not alphabetically) |
| SORT-8 | Sort Due Date | Click header | Dates sorted chronologically, nulls at end |
| SORT-9 | Sort Time Interval | Click header | Numbers sorted numerically, nulls at end |
| SORT-10 | Sort Notes | Click header | Sorted alphabetically |
| SORT-11 | Only one sort at a time | Sort column A, then sort column B | Only column B shows arrow indicator |
| SORT-12 | Sort + search combo | Sort by name, then search | Sort preserved, search filters within sorted order |
| SORT-13 | Sort + filter combo | Sort by status date, then filter by "Completed" | Sort preserved, filter narrows results |
| SORT-14 | Sort clears on Add Row | Sort by name, then "Add Row" | Sort clears, new row appears at top |
| SORT-15 | Sort clears on Duplicate | Sort by name, select row, "Duplicate Mbr" | Sort clears, duplicate appears near source |
| SORT-16 | Edit during sort freezes order | Sort by status date, edit a cell | Row order does NOT jump after save (frozen) |

---

## NEW Section F: Filter Chip Count Verification

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| FILT-1 | All chip shows total | Load grid, check "All" chip | Shows total row count |
| FILT-2 | Not Addressed count | Check chip | Matches actual "Not Addressed" rows in grid |
| FILT-3 | Overdue count | Check chip | Matches rows where dueDate < today |
| FILT-4 | In Progress count | Check chip | Matches blue-colored rows |
| FILT-5 | Contacted count | Check chip | Matches yellow-colored rows |
| FILT-6 | Completed count | Check chip | Matches green-colored rows |
| FILT-7 | Declined count | Check chip | Matches purple-colored rows |
| FILT-8 | Resolved count | Check chip | Matches orange-colored rows |
| FILT-9 | N/A count | Check chip | Matches gray-colored rows |
| FILT-10 | Duplicates count | Check chip | Matches rows with orange left border |
| FILT-11 | Counts update after edit | Change a status (e.g., Not Addressed → AWV completed) | Chip counts update: Not Addressed decreases, Completed increases |
| FILT-12 | Counts update after add row | Add a new row | "All" count increases by 1, "Not Addressed" increases by 1 |
| FILT-13 | Counts update after delete | Delete a row | Counts decrease accordingly |
| FILT-14 | Multi-filter selection | Click "Completed" then "In Progress" | Both active, grid shows union of both, counts unchanged |
| FILT-15 | Duplicates is exclusive | Click "Duplicates" while status filter active | Status filters deselect, only duplicate rows shown |

---

## NEW Section G: Overdue Detection Edge Cases

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| OVR-1 | Row turns red when overdue | Set past status date + status with due days | Row background is red (#FFCDD2) |
| OVR-2 | Red overrides blue (in progress) | Blue status + past due date | Row is RED, not blue |
| OVR-3 | Red overrides yellow (contacted) | Yellow status + past due date | Row is RED, not yellow |
| OVR-4 | Red overrides white (not addressed) | Status with due days + past date | Row is RED |
| OVR-5 | Red DOES override green (completed) | Green status (e.g., "AWV completed") + past due date | Row is RED — `isRowOverdue` does NOT exclude green; overdue check (line 117) runs before green check (line 120) in `getRowStatusColor` |
| OVR-6 | Red does NOT override purple (declined) | Declined status (no due date) | Row stays PURPLE — `isRowOverdue` returns false for PURPLE_STATUSES (line 87); also declined statuses have no due date |
| OVR-7 | Red does NOT override gray (N/A) | N/A status | Row stays GRAY — `isRowOverdue` returns false for GRAY_STATUSES (line 86) |
| OVR-8 | Due date exactly today | Status date + interval = today | NOT overdue (due today is not past due) |
| OVR-9 | Due date yesterday | Status date + interval = yesterday | IS overdue (red) |
| OVR-10 | Overdue + duplicate indicator | Duplicate row that is overdue | Red background WITH orange left border |

---

## NEW Section H: Toast Notifications & Error Handling

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| TOAST-1 | Toast on successful cell edit | Edit any cell, save | Green toast "Update saved" appears briefly |
| TOAST-2 | Toast on API error | Simulate network failure (disconnect Docker backend), edit cell | Red toast with error message |
| TOAST-3 | Toast on Add Row success | Click "Add Row", fill name, save | Toast "Row added" |
| TOAST-4 | Toast on Delete Row success | Select row, "Delete Row", confirm | Toast "Row deleted" |
| TOAST-5 | Toast on Import success | Import a valid CSV file | Toast with import summary |
| TOAST-6 | Toast auto-dismisses | Trigger a success toast | Disappears after ~3 seconds |
| TOAST-7 | Multiple toasts stack | Rapidly save 2 cells | Toasts stack vertically, both visible |

---

## NEW Section I: Duplicate Detection Flow

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| DUP-1 | Duplicate Mbr button creates duplicate | Select row, click "Duplicate Mbr" | New row appears with same name, orange left border, isDuplicate=true |
| DUP-2 | Duplicate chip count updates | Create a duplicate | "Duplicates" chip count increases by 1 |
| DUP-3 | Duplicate filter shows only duplicates | Click "Duplicates" chip | Only rows with orange left border shown |
| DUP-4 | Duplicate row editable | Create duplicate, edit its fields | All fields editable independently of source row |
| DUP-5 | 409 conflict on concurrent edit | Open 2 browser tabs, edit same cell in both | Second save shows error toast with conflict message |

---

## NEW Section J: Keyboard Navigation

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| KBD-1 | Tab moves between cells | Click a cell, press Tab | Focus moves to next editable cell |
| KBD-2 | Shift+Tab moves backward | Press Shift+Tab | Focus moves to previous editable cell |
| KBD-3 | Enter commits cell edit | Edit a cell, press Enter | Value saves, editing stops |
| KBD-4 | Escape cancels cell edit | Edit a cell, press Escape | Original value restored, editing stops |
| KBD-5 | Arrow keys in dropdown | Open dropdown, press ArrowDown/Up | Highlight moves through options |
| KBD-6 | Enter selects dropdown option | Highlight an option, press Enter | Option selected, dropdown closes |
| KBD-7 | Type-ahead in dropdown | Open dropdown, type "A" | First option starting with "A" highlighted |
| KBD-8 | Ctrl+F focuses search | Press Ctrl+F anywhere on grid | Search input gets focus |

---

## NEW Section K: HgbA1c Goal Special Fields

> HgbA1c rows have special goal-tracking fields (checkboxes and goal value).

| ID | Test | Steps | Expected |
|----|------|-------|----------|
| HGBA1C-1 | HgbA1c Goal column visible for Diabetes Control | Set QM="Diabetes Control", toggle Member Info ON | HgbA1c Goal column shows numeric input or value |
| HGBA1C-2 | HgbA1c Goal Reached Year checkbox | Find HgbA1c row, check "Goal Reached Year" | Checkbox toggles, saves |
| HGBA1C-3 | HgbA1c Declined checkbox | Find HgbA1c row, check "Declined" | Checkbox toggles, saves |
| HGBA1C-4 | HgbA1c fields hidden for non-HgbA1c rows | Check a non-diabetes row | HgbA1c fields show N/A or are hidden |

---

## Existing Sections (Retained from v1)

### Section 1: Auth Flow (22 tests) — AUTH-1.1 through AUTH-4.10
*(Unchanged — see v1 for details)*

### Section 2: Patient Grid — Header, Load, Toolbar, Filter, Columns, Colors, Editing, Sorting, Status Bar
*(Retained — see v1 for GRID-1.1 through GRID-9.3)*
*(Sections C, D, E, F, G above EXPAND AND REPLACE the basic GRID-6.x, GRID-7.x, GRID-8.x tests)*

### Section 3: Import Flow (19 tests) — IMP-1.1 through IMP-3.4
*(Unchanged — see v1 for details)*

### Section 4: Admin Pages (21 tests) — ADM-1.1 through ADM-4.6
*(Unchanged — see v1 for details)*

### Section 5: Cross-Cutting (19 tests) — RESP, A11Y, VIS
*(Unchanged — see v1 for details)*

---

## Test Count Summary

| Section | Tests | New in v2.1 |
|---------|-------|-------------|
| A: Cell Rendering Integrity | 10 | NEW |
| B: Role-Based Access Control | 42 | NEW |
| C: Quality Measure × Status Matrix | ~140 | NEW |
| D: Search | 12 | NEW |
| E: Sorting | 16 | NEW |
| F: Filter Chip Counts | 15 | NEW |
| G: Overdue Edge Cases | 10 | NEW |
| H: Toast Notifications | 7 | NEW (v2.1) |
| I: Duplicate Detection | 5 | NEW (v2.1) |
| J: Keyboard Navigation | 8 | NEW (v2.1) |
| K: HgbA1c Goal Fields | 4 | NEW (v2.1) |
| 1: Auth Flow (v1) | 22 | -- |
| 2: Patient Grid basics (v1) | 77 | -- |
| 3: Import Flow (v1) | 19 | -- |
| 4: Admin Pages (v1) | 21 | -- |
| 5: Cross-Cutting (v1) | 19 | -- |
| **TOTAL** | **~427** | **~269 new** |

---

## Execution Strategy

### Phase 1: RBAC (Section B) — ~30 min
Login as each role, verify access, screenshot physician selector.

### Phase 2: Cell Rendering (Section A) — ~10 min
Toggle member info, check all columns render data not HTML.

### Phase 3: Quality Measure Matrix (Section C) — ~2-3 hours
Go through each QM group systematically. Use Add Row for clean tests.
Take screenshots of each row color state.

### Phase 4: Search + Sort + Filters (Sections D, E, F) — ~30 min
Test search combos, sort each column, verify chip counts.

### Phase 5: Overdue Edge Cases (Section G) — ~15 min
Set past dates, verify red override logic.

### Phase 6: Toast + Duplicates + Keyboard (Sections H, I, J) — ~20 min
Trigger toast notifications, create duplicates, test keyboard nav.

### Phase 7: HgbA1c Goal Fields (Section K) — ~10 min
Test HgbA1c-specific goal tracking fields and checkboxes.

### Phase 8: Existing sections (1, 3, 4, 5) — ~1 hour
Auth flow, import, admin, responsive/a11y.
