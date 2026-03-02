# Bulk Operations Tab - Page Guide

## URL
`/patient-management?tab=bulk-ops`

## Access
- ADMIN role only (tab not visible to PHYSICIAN or STAFF)
- Part of PatientManagementPage with tabs: Import, Reassign, Bulk Operations

## Components
- `frontend/src/pages/BulkOperationsTab.tsx` - Main tab component
- `frontend/src/components/modals/AssignModal.tsx` - Bulk assign modal
- `frontend/src/components/modals/UnassignModal.tsx` - Bulk unassign modal
- `frontend/src/components/modals/DeleteModal.tsx` - Bulk delete modal
- `frontend/src/stores/bulkPatientStore.ts` - Zustand store
- `frontend/src/types/bulkPatient.ts` - TypeScript types

## Layout Structure
1. Summary Cards (4-column responsive grid)
2. Toolbar (selection + action buttons)
3. Filter Bar (physician, insurance, measure dropdowns + search)
4. Patient Table (sticky headers, checkboxes, 8 columns)
5. Footer (patient count + selected count)

## Summary Cards
| Card | Color | Value |
|------|-------|-------|
| Total Patients | Blue (bg-blue-50, text-blue-700, border-blue-200) | `summary.totalPatients` |
| Assigned | Green (bg-green-50, text-green-700, border-green-200) | `summary.assignedCount` |
| Unassigned | Amber (bg-amber-50, text-amber-700, border-amber-200) | `summary.unassignedCount` |
| Insurance Systems | Purple (bg-purple-50, text-purple-700, border-purple-200) | `summary.insuranceSystemCount` |

## Toolbar Buttons
- **Select All / Deselect All**: Toggle based on selection state. Shows count in parentheses.
- **Assign**: Blue (bg-blue-600). Shows count when selected. Opens AssignModal.
- **Unassign**: Amber (bg-amber-600). Shows count when selected. Opens UnassignModal.
- **Delete**: Red (bg-red-600). Shows count when selected. Opens DeleteModal.
- All action buttons: `disabled:opacity-50 disabled:cursor-not-allowed` when no selection.

## Filter Bar
- Physician dropdown: "All Physicians" + "Unassigned" + physician names
- Insurance dropdown: "All Insurance" + insurance group names
- Measure dropdown: "All Measures" + quality measure names
- Search: Text input with clear (X) button
- "Clear filters" link appears when any filter is active

## Patient Table Columns
| Column | Data | Notes |
|--------|------|-------|
| Checkbox | Selection | Header checkbox selects all visible |
| Patient Name | `memberName` | Font-medium, gray-900 |
| DOB | `memberDob` | ISO format (1990-01-01) |
| Physician | `ownerName` | "Unassigned" badge if null (red-500, italic, bg-red-50) |
| Insurance | `insuranceGroup` | "--" if null |
| Measure | `latestMeasure` | "--" if null |
| Status | `latestStatus` | "--" if null |
| Measures | `measureCount` | Right-aligned |

## Selection Behavior
- Click row -> toggle selection (bg-blue-50 when selected)
- Click checkbox -> toggle selection (stopPropagation prevents double-toggle)
- Select All -> selects all FILTERED patients
- Deselect All -> clears all selections
- Header checkbox -> toggles all filtered

## Modals
### AssignModal (Blue theme)
- Icon: UserPlus in blue-100 circle
- Physician dropdown (required)
- Patient preview (max 10, overflow count)
- Audit log note
- Assign button disabled until physician selected

### UnassignModal (Amber theme)
- Icon: UserMinus in amber-100 circle
- Warning banner: "Unassigned patients will not appear in any physician's view"
- Patient preview (max 10)
- Audit log note
- Confirm button always enabled

### DeleteModal (Red/Danger theme)
- Icon: Trash2 in red-100 circle
- Subtitle in red-600: "X patients will be permanently deleted"
- Danger warning banner: "This action cannot be undone"
- Patient preview shows ID instead of physician
- "Type DELETE to confirm" input (focus ring: ring-red-500)
- Delete button disabled until "DELETE" typed exactly

## Empty States
- No patients at all: Users icon + "No patients found" + "Import patients to get started"
- No filter matches: Search icon + "No patients match your filters" + "Clear filters" link

## API Endpoints
- `GET /api/admin/patients/bulk-list` - Fetch all patients for bulk ops
- `GET /api/admin/physicians` - Fetch physician list
- `PATCH /api/admin/patients/bulk-assign` - Assign/unassign patients
- `DELETE /api/admin/patients/bulk-delete` - Delete patients

## Key UX Review Points
- [ ] Numbers locale-formatted (commas)
- [ ] Selection blue tint visible
- [ ] Disabled buttons at 50% opacity
- [ ] Modal themes match action colors
- [ ] DELETE confirmation works
- [ ] Empty states are clear
- [ ] Responsive grid (4->2->1 columns)
- [ ] Table scrollable at 600px max-height

## Known Issues (from 2026-03-02 review)
- Modals missing role="dialog", aria-modal, aria-labelledby
- Row checkboxes missing aria-label
- Modal close (X) button missing aria-label
- Tab buttons missing ARIA tab pattern
- Mobile table truncated (no horizontal scroll)
- Checkbox touch targets 13x13px (need 44x44px)
- DOB format inconsistent with main grid (ISO vs US locale)
