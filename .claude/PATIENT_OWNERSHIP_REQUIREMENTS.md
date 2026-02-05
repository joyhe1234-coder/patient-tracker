# Patient Ownership & Assignment System Requirements

**Created:** February 3, 2026
**Status:** Approved for Implementation

---

## Overview

This document defines the requirements for patient ownership, viewing permissions, import assignment, and bulk patient management. The goal is to ensure physicians only see their own patients, prevent accidental imports to wrong physicians, and allow admins to manage patient assignments.

---

## Design Decisions

| Question | Decision |
|----------|----------|
| Admin default view | Empty until physician selected (no "all patients" dump) |
| Admin-as-Physician | Opt-in via `canHavePatients` flag on User model |
| Import existing patients | Warn before reassigning, require explicit confirmation |
| Reassignment capability | Full power for admin (any → any, including unassign) |
| Staff behavior | Same as admin - must select physician first |

---

## Data Model

### User Model Changes

```prisma
model User {
  // ...existing fields...
  canHavePatients  Boolean  @default(false)
}
```

**Rules:**
- **PHYSICIAN**: `canHavePatients = true` (always, enforced on create/update)
- **ADMIN**: `canHavePatients = false` by default, can be set to `true` to act as physician
- **STAFF**: `canHavePatients = false` (always, enforced)

### Patient Model (No Changes)

```prisma
model Patient {
  ownerId  Int?  @relation(...)  // null = unassigned
}
```

---

## Role-Based Access Control

### Access Matrix

| Action | PHYSICIAN | STAFF | ADMIN |
|--------|-----------|-------|-------|
| View patients | Own only (auto) | Assigned physicians (select) | All (select) |
| View unassigned | ❌ | ❌ | ✅ |
| Import patients | → Self (auto) | → Selected physician | → Selected physician |
| Bulk assign | ❌ | ❌ | ✅ |
| Reassign patients | ❌ | ❌ | ✅ |
| Enable canHavePatients | ❌ | ❌ | ✅ (for admins) |

### Physician Selector Visibility

| Role | Selector Visible | Options |
|------|------------------|---------|
| PHYSICIAN | Hidden | N/A (auto-filtered to self) |
| STAFF | Visible | Assigned physicians only |
| ADMIN | Visible | All with `canHavePatients=true` + "Unassigned" |

---

## API Specifications

### GET /api/patients

**Changes:**
- ADMIN/STAFF: Require `ownerId` query param (return 400 if missing)
- PHYSICIAN: Ignore `ownerId` param, always filter to `user.id`
- Support `?ownerId=null` or `?unassigned=true` for unassigned patients

**Response:** Unchanged (array of patients)

**Errors:**
```json
{
  "success": false,
  "error": {
    "message": "Physician selection required",
    "code": "PHYSICIAN_REQUIRED"
  }
}
```

---

### GET /api/users/physicians

**Purpose:** Get list of users who can own patients (for dropdowns)

**Authorization:** ADMIN or STAFF

**Query Params:**
- `forStaff=true` - Filter to physicians assigned to requesting staff user

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Dr. Smith", "email": "smith@clinic.com", "role": "PHYSICIAN" },
    { "id": 5, "name": "Admin User", "email": "admin@clinic.com", "role": "ADMIN" }
  ]
}
```

**Logic:**
- Returns all users where `canHavePatients = true`
- For STAFF with `forStaff=true`: Filter to their assigned physicians only
- Sorted by name

---

### POST /api/import/preview

**Changes to Response:**
```json
{
  "success": true,
  "data": {
    "previewId": "...",
    "summary": { ... },
    "reassignments": [
      {
        "patientId": 123,
        "memberName": "John Doe",
        "memberDob": "1990-01-15",
        "currentOwnerId": 5,
        "currentOwnerName": "Dr. Johnson",
        "newOwnerId": 10
      }
    ],
    "reassignmentCount": 3,
    "changes": [ ... ]
  }
}
```

**Logic:**
- Compare each patient in import against existing database
- If patient exists with different `ownerId`, add to `reassignments` array
- Include current owner name for display

---

### POST /api/import/execute/:previewId

**Changes:**
- Add `confirmReassign` query param or body field
- If `reassignmentCount > 0` and `confirmReassign !== true`, return error

**Request:**
```
POST /api/import/execute/abc123?confirmReassign=true&physicianId=10
```

**Error Response (if reassignments not confirmed):**
```json
{
  "success": false,
  "error": {
    "message": "Import would reassign 3 patients to a different physician",
    "code": "REASSIGNMENT_CONFIRMATION_REQUIRED",
    "reassignments": [ ... ]
  }
}
```

---

### PATCH /api/patients/bulk-assign

**Purpose:** Bulk assign patients to a physician (admin only)

**Authorization:** ADMIN only

**Request:**
```json
{
  "patientIds": [1, 2, 3, 4, 5],
  "ownerId": 10
}
```

Or to unassign:
```json
{
  "patientIds": [1, 2, 3],
  "ownerId": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated": 5,
    "newOwnerId": 10,
    "newOwnerName": "Dr. Smith"
  }
}
```

**Validation:**
- `patientIds` must be non-empty array
- `ownerId` must be null or valid user with `canHavePatients = true`
- All patient IDs must exist

---

### PATCH /api/users/:id

**Changes:**
- Handle `canHavePatients` field in request body
- Validation:
  - PHYSICIAN: Always set to `true`, ignore request value
  - STAFF: Always set to `false`, ignore request value
  - ADMIN: Accept request value

---

## UI Specifications

### Patient Grid Page

#### For PHYSICIAN
- No physician selector
- Grid auto-loads with their patients
- No changes needed

#### For STAFF/ADMIN

**Initial State (no physician selected):**
```
┌─────────────────────────────────────────────────────────────┐
│ Viewing: [Select Physician ▼]           [Import] [+ Add Row]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         👤 Please select a physician to view patients       │
│                                                             │
│            Select from the dropdown above to begin          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**After Selection:**
```
┌─────────────────────────────────────────────────────────────┐
│ Viewing: [Dr. Smith ▼]                  [Import] [+ Add Row]│
├─────────────────────────────────────────────────────────────┤
│ Name          │ DOB   │ Request Type │ Quality Measure │... │
├───────────────┼───────┼──────────────┼─────────────────┼────┤
│ John Doe      │ ###   │ AWV          │ Annual Wellness │... │
│ Jane Smith    │ ###   │ Quality      │ Diabetes Control│... │
└─────────────────────────────────────────────────────────────┘
```

**Dropdown Options:**

For ADMIN:
- All users with `canHavePatients = true`
- "Unassigned" option (shows patients with `ownerId = null`)
- Self (if admin has `canHavePatients = true`)

For STAFF:
- Only their assigned physicians

**Persistence:**
- Store selected physician ID in localStorage
- Restore on page reload
- Clear if selected physician no longer valid

---

### Import Flow

#### Step 1: Import Page

**For PHYSICIAN:**
- No physician selector
- Import proceeds directly

**For STAFF/ADMIN:**
```
┌─────────────────────────────────────────────────────────────┐
│ Import Patients                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Import to: [Select Physician ▼]  ← Required                 │
│                                                             │
│ Healthcare System: [Hill Physicians ▼]                      │
│                                                             │
│ Import Mode: ○ Merge (recommended)  ○ Replace All           │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐   │
│ │                                                       │   │
│ │        Drag and drop a CSV or Excel file here        │   │
│ │                  or click to browse                   │   │
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Preview Import] (disabled)    │
└─────────────────────────────────────────────────────────────┘
```

**Validation:**
- "Preview Import" button disabled until physician selected
- Show hint: "Please select a physician to import to"

---

#### Step 2: Preview Page (with reassignments)

If import contains patients currently assigned to other physicians:

```
┌─────────────────────────────────────────────────────────────┐
│ Import Preview                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️  REASSIGNMENT WARNING                                │ │
│ │                                                         │ │
│ │ 3 patients in this import are currently assigned to     │ │
│ │ other physicians and will be reassigned to Dr. Smith:   │ │
│ │                                                         │ │
│ │ • John Doe (currently: Dr. Johnson)                     │ │
│ │ • Jane Smith (currently: Dr. Williams)                  │ │
│ │ • Bob Brown (currently: Unassigned)                     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Summary:                                                    │
│ [INSERT: 45] [UPDATE: 12] [SKIP: 8] [REASSIGN: 3]          │
│                                                             │
│                    [Cancel]  [Execute Import]               │
└─────────────────────────────────────────────────────────────┘
```

**Execute Button Behavior:**
- If reassignments exist, show confirmation dialog first
- Dialog: "This will reassign 3 patients from other physicians. Continue?"
- [Cancel] [Yes, Reassign and Import]

---

### Patient Assignment Page (Admin Only)

**URL:** `/admin/patient-assignment`

**Navigation:** Add to Admin sidebar

```
┌─────────────────────────────────────────────────────────────┐
│ Patient Assignment                              [Admin Nav] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Filter by Current Owner: [All ▼]    Search: [____________]  │
│                                                             │
│ Selected: 3 patients    [Assign to... ▼] [Unassign]         │
├─────────────────────────────────────────────────────────────┤
│ ☑ │ Patient Name    │ DOB        │ Current Owner           │
│───┼─────────────────┼────────────┼─────────────────────────│
│ ☑ │ John Doe        │ 1990-01-15 │ Dr. Smith               │
│ ☐ │ Jane Doe        │ 1985-03-22 │ Dr. Smith               │
│ ☑ │ Bob Wilson      │ 1978-11-30 │ Unassigned              │
│ ☑ │ Alice Brown     │ 1992-07-14 │ Dr. Johnson             │
│ ☐ │ Carol White     │ 1988-06-05 │ Unassigned              │
└─────────────────────────────────────────────────────────────┘
        Page 1 of 10    [<] [1] [2] [3] ... [10] [>]
```

**Features:**
- Filter dropdown: "All", each physician name, "Unassigned"
- Search by patient name
- Checkbox column for bulk selection
- "Select All" checkbox in header
- "Assign to..." dropdown with all physicians
- "Unassign" button (sets ownerId to null)
- Confirmation dialog before bulk operations
- Pagination for large datasets

**Confirmation Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│ Confirm Assignment                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Assign 3 patients to Dr. Johnson?                           │
│                                                             │
│ • John Doe (from: Dr. Smith)                                │
│ • Bob Wilson (from: Unassigned)                             │
│ • Alice Brown (from: Dr. Johnson → no change)               │
│                                                             │
│                         [Cancel]  [Assign]                  │
└─────────────────────────────────────────────────────────────┘
```

---

### User Management Updates

**Edit User Form (Admin users only):**

```
┌─────────────────────────────────────────────────────────────┐
│ Edit User                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Name:  [Admin User            ]                             │
│                                                             │
│ Email: [admin@clinic.com      ]                             │
│                                                             │
│ Role:  [ADMIN ▼]                                            │
│                                                             │
│ ☑ Can have patients assigned                                │
│   Allows this admin to also function as a physician         │
│   and have patients assigned directly to them.              │
│                                                             │
│                           [Cancel]  [Save]                  │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Checkbox only visible for ADMIN role
- PHYSICIAN: Show as checked and disabled with text "Physicians always have patients"
- STAFF: Hide checkbox entirely

---

## Implementation Phases

### Phase 12a: Database & Backend Foundation
1. Create migration for `canHavePatients` field
2. Update seed.ts to set `canHavePatients=true` for PHYSICIAN
3. Update user create/update APIs

### Phase 12b: Patient Filtering
1. Update GET /api/patients with owner filtering
2. Create GET /api/users/physicians endpoint
3. Add authorization checks

### Phase 12c: Import Updates
1. Update preview to detect reassignments
2. Update execute to require confirmation
3. Add tests

### Phase 12d: Patient Grid UI
1. Add physician selector component
2. Implement "select to view" state
3. Store selection in localStorage

### Phase 12e: Import Modal UI
1. Add physician selector to import page
2. Add reassignment warning display
3. Add confirmation dialog

### Phase 12f: Bulk Assignment
1. Create bulk-assign endpoint
2. Create Patient Assignment page
3. Add to admin navigation

### Phase 12g: User Management UI
1. Add canHavePatients toggle
2. Update form validation

### Phase 12h: Concurrent Editing (TBD)

**Status:** Placeholder - requirements to be discussed

**Problem:** Multiple users (e.g., staff members, or physician + staff) may edit the same physician's patients simultaneously. Need to handle conflicts.

**Options to Consider:**
- Optimistic locking (detect conflicts on save)
- Pessimistic locking (lock rows while editing)
- Real-time sync (WebSocket push updates)
- Last-write-wins (simplest, but may lose data)

**Open Questions:**
- Scope: per-cell, per-row, or per-physician?
- Conflict resolution UX?
- Priority vs other features?

---

## Test Cases

### Backend Tests
- [ ] GET /api/patients returns 400 for ADMIN without ownerId
- [ ] GET /api/patients returns 400 for STAFF without ownerId
- [ ] GET /api/patients auto-filters for PHYSICIAN
- [ ] GET /api/patients?ownerId=null returns unassigned
- [ ] GET /api/users/physicians returns only canHavePatients=true users
- [ ] POST /api/import/preview includes reassignments array
- [ ] POST /api/import/execute fails without confirmReassign when needed
- [ ] PATCH /api/patients/bulk-assign updates all patients
- [ ] PATCH /api/patients/bulk-assign validates ownerId
- [ ] User create sets canHavePatients correctly by role

### Frontend Tests
- [ ] Physician selector hidden for PHYSICIAN role
- [ ] Physician selector visible for STAFF/ADMIN
- [ ] Grid shows placeholder when no physician selected
- [ ] Import disabled without physician selected
- [ ] Reassignment warning displays correctly
- [ ] Bulk assignment page loads and filters
- [ ] canHavePatients toggle works in user form

### E2E Tests
- [ ] PHYSICIAN can view and import patients
- [ ] STAFF must select physician to view
- [ ] ADMIN can view unassigned patients
- [ ] Import with reassignment shows warning
- [ ] Bulk assignment flow works end-to-end

---

## Migration Notes

### Existing Data
- Existing patients may have `ownerId = null`
- These become "Unassigned" patients
- Admin can bulk-assign them

### Existing Users
- Existing PHYSICIAN users: Set `canHavePatients = true`
- Existing ADMIN users: Keep `canHavePatients = false` (opt-in)
- Existing STAFF users: Keep `canHavePatients = false`

---

## Last Updated

February 3, 2026
