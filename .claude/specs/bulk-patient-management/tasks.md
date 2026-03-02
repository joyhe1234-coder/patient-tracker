# Implementation Plan: Bulk Patient Management

## Task Overview

Extend the existing Patient Management page with a new admin-only "Bulk Operations" tab that allows bulk assign, unassign, and delete operations on all patients (assigned and unassigned). The implementation adds two new backend endpoints, a Zustand store, three modals, a Toast component, and Socket.IO broadcasts. All tasks follow TDD: write the failing test first, then implement to make it pass.

The task sequence is: types → backend handlers → backend routes → store → Toast → modals → main tab component → parent page integration → E2E tests.

## Steering Document Compliance

- **structure.md**: New files follow the naming conventions (PascalCase for components, camelCase for stores, kebab-case for routes/E2E specs)
- **tech.md**: React 18 + TypeScript, Tailwind CSS, Zustand (no persist), Axios `api` instance, Express + Prisma, ESM imports with `.js` extensions in backend
- File-scope: all backend additions go into existing `patientHandlers.ts` and `admin.routes.ts` (no new backend files needed)
- Test-first: each implementation task is preceded by a test task for that unit

## Atomic Task Requirements

Each task touches 1-3 related files, is completable in 15-30 minutes, and has one testable outcome.

---

## Tasks

### Phase 1: Type Definitions (Foundation)

- [x] 1. Create frontend TypeScript type definitions for bulk patient management
  - File to create: `frontend/src/types/bulkPatient.ts`
  - Define `BulkPatient` interface with: `id`, `memberName`, `memberDob`, `memberTelephone`, `ownerId`, `ownerName`, `insuranceGroup`, `measureCount`, `latestMeasure`, `latestStatus`, `updatedAt`
  - Define `PatientSummary` interface with: `totalPatients`, `assignedCount`, `unassignedCount`, `insuranceSystemCount`
  - Define `PatientFilters` interface with: `physician` (string, `''` = all, `'__unassigned__'` = unassigned), `insurance`, `measure`, `search`
  - Define `Physician` interface with: `id`, `displayName`, `email`, `role`
  - All fields typed as per design.md Data Models section
  - _Requirements: REQ-BPM-1, REQ-BPM-10_
  - _Leverage: `frontend/src/types/index.ts`, `frontend/src/types/grid.ts` (for type file pattern)_

---

### Phase 2: Backend — New Handler Functions (TDD)

- [ ] 2. Write failing Jest tests for `getAllPatients` handler
  - File to create: `backend/src/routes/handlers/__tests__/patientHandlers.getAllPatients.test.ts`
  - Test cases:
    - Returns 200 with `{ success: true, data: { patients: [], summary: {...} } }` shape when database is empty
    - Returns all patients regardless of `ownerId` (both assigned and unassigned)
    - Each patient in response has fields: `id`, `memberName`, `memberDob`, `memberTelephone`, `ownerId`, `ownerName`, `insuranceGroup`, `measureCount`, `latestMeasure`, `latestStatus`, `updatedAt`
    - `summary` contains correct `totalPatients`, `assignedCount`, `unassignedCount`, `insuranceSystemCount`
    - Patients are ordered by `memberName` ascending
    - Mock Prisma `patient.findMany` and `patient.count`/aggregate calls
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-10_
  - _Leverage: `backend/src/routes/handlers/__tests__/` (existing test patterns), `backend/src/routes/handlers/patientHandlers.ts` (mock target)_

- [ ] 3. Implement `getAllPatients` handler in `patientHandlers.ts`
  - File to modify: `backend/src/routes/handlers/patientHandlers.ts`
  - Add exported async function `getAllPatients(req, res, next)`
  - Prisma query: `patient.findMany` with `select` for id, memberName, memberDob, memberTelephone, ownerId, insuranceGroup, updatedAt, `owner: { select: { displayName: true } }`, `measures: { select: { qualityMeasure, measureStatus, updatedAt }, orderBy: { updatedAt: 'desc' }, take: 1 }`, `_count: { select: { measures: true } }`; `orderBy: { memberName: 'asc' }`
  - Compute `summary` from returned patients: `totalPatients`, `assignedCount` (where `ownerId !== null`), `unassignedCount`, `insuranceSystemCount` (distinct `insuranceGroup` values)
  - Map each patient to `BulkPatient`-shaped response object (convert `memberDob` to ISO date string, flatten `owner.displayName` to `ownerName`, etc.)
  - Wrap in try/catch with `next(error)`
  - All tests from task 2 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-10, NFR-SEC-1_
  - _Leverage: `backend/src/routes/handlers/patientHandlers.ts` (existing `getUnassignedPatients` pattern), `backend/src/config/database.ts` (prisma import)_

- [x] 4. Write failing Jest tests for `bulkDeletePatients` handler
  - File to create: `backend/src/routes/handlers/__tests__/patientHandlers.bulkDelete.test.ts`
  - Test cases:
    - Returns 400 `VALIDATION_ERROR` when `patientIds` is missing
    - Returns 400 `VALIDATION_ERROR` when `patientIds` is an empty array
    - Returns 400 `VALIDATION_ERROR` when `patientIds` contains non-integers
    - Returns 400 `PAYLOAD_TOO_LARGE` when `patientIds` has more than 5,000 elements
    - Returns 200 `{ success: true, data: { deleted: N }, message: "Successfully deleted N patient(s)" }` on success
    - Calls `prisma.$transaction` with `patient.deleteMany` and `auditLog.create`
    - Calls `broadcastToRoom` with affected physician room names after delete
    - Calls `broadcastToRoom` with `'unassigned'` room when unassigned patients are deleted
    - Handles non-existent IDs gracefully (deleteMany skips them; reports actual count)
    - Mock Prisma and `socketManager` (`broadcastToRoom`, `getRoomName`, `getIO`)
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-9, NFR-SEC-1, NFR-SEC-5, NFR-SEC-6, NFR-REL-1_
  - _Leverage: `backend/src/routes/handlers/__tests__/` (existing patterns), `backend/src/routes/handlers/patientHandlers.ts`_

- [ ] 5. Implement `bulkDeletePatients` handler in `patientHandlers.ts`
  - File to modify: `backend/src/routes/handlers/patientHandlers.ts`
  - Add exported async function `bulkDeletePatients(req, res, next)`
  - Validation: check `patientIds` is a non-empty array of integers; reject with 400 `VALIDATION_ERROR` if not; reject with 400 `PAYLOAD_TOO_LARGE` if length > 5,000
  - Within `prisma.$transaction`: (a) query affected patients' `ownerId` values before deletion, (b) call `tx.patient.deleteMany({ where: { id: { in: patientIds } } })`, (c) call `tx.auditLog.create` with action `'BULK_DELETE_PATIENTS'`, `userId`, `userEmail`, `ipAddress`, and details `{ patientIds, count: result.count }`
  - After transaction: call `getIO()`, broadcast `data:refresh` to each affected physician room via `broadcastToRoom(getRoomName(ownerId), 'data:refresh', { reason: 'bulk-delete' }, req.socketId)`, also broadcast to `'unassigned'` room if any patients had `ownerId === null`
  - Return `{ success: true, data: { deleted: result.count }, message: "Successfully deleted N patient(s)" }`
  - Add ESM imports for `broadcastToRoom`, `getRoomName`, `getIO` from socket manager
  - All tests from task 4 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-9, REQ-BPM-14, NFR-REL-1, NFR-SEC-3, NFR-SEC-5, NFR-SEC-6_
  - _Leverage: `backend/src/routes/handlers/patientHandlers.ts` (`bulkAssignPatients` transaction pattern), design.md Socket.IO section_

- [x] 6. Write failing Jest tests for enhanced `bulkAssignPatients` Socket.IO broadcast
  - File to modify (add tests): `backend/src/routes/handlers/__tests__/patientHandlers.bulkAssign.test.ts` (create if not exists, or append to existing)
  - Test cases (Socket.IO broadcast additions only):
    - After successful assign (ownerId = physicianId), calls `broadcastToRoom` with the new physician's room
    - After successful assign, calls `broadcastToRoom` for each previous owner's room (patients may have been moved from other physicians)
    - After successful unassign (ownerId = null), calls `broadcastToRoom` with `'unassigned'` room name
    - Does not throw when `getIO()` returns null (no socket server available)
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-14_
  - _Leverage: task 4 test patterns, `backend/src/routes/handlers/patientHandlers.ts`_

- [ ] 7. Add Socket.IO broadcasts to existing `bulkAssignPatients` handler
  - File to modify: `backend/src/routes/handlers/patientHandlers.ts`
  - Inside the existing `bulkAssignPatients` function, after the `$transaction` completes:
    - Query the previous `ownerId` values for the affected patient IDs (using a query before/inside the transaction)
    - Call `getIO()` and guard with `if (io)`
    - If assigning (ownerId is not null): broadcast to `getRoomName(ownerId)` with reason `'bulk-assign'`; broadcast to each previous owner room that differs from the new owner
    - If unassigning (ownerId is null): broadcast to `getRoomName('unassigned')` with reason `'bulk-unassign'`; broadcast to each previous owner room
  - Add ESM imports for `broadcastToRoom`, `getRoomName`, `getIO`
  - All tests from task 6 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-14_
  - _Leverage: `backend/src/routes/handlers/patientHandlers.ts`, design.md Socket.IO section_

---

### Phase 3: Backend — Route Registration

- [ ] 8. Write failing Jest route auth tests for new admin patient endpoints
  - File to create: `backend/src/routes/__tests__/admin.routes.bulkpatient.test.ts`
  - Test cases:
    - `GET /api/admin/patients` returns 401 without Authorization header
    - `GET /api/admin/patients` returns 403 with a non-ADMIN JWT token
    - `DELETE /api/admin/patients/bulk-delete` returns 401 without Authorization header
    - `DELETE /api/admin/patients/bulk-delete` returns 403 with a non-ADMIN JWT token
    - Use `supertest` with the Express app; mock the `requireAuth` and `requireRole` middleware to return 401/403 as needed (consistent with existing route test patterns in `backend/src/routes/__tests__/`)
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-9, REQ-BPM-10, NFR-SEC-1_
  - _Leverage: `backend/src/routes/__tests__/` (existing route auth test patterns)_

- [ ] 9. Register two new routes in `admin.routes.ts`
  - File to modify: `backend/src/routes/admin.routes.ts`
  - Add `getAllPatients` and `bulkDeletePatients` to the import line from `./handlers/patientHandlers.js`
  - Register `router.get('/patients', getAllPatients)` — place BEFORE the existing `router.get('/patients/unassigned', ...)` line to ensure correct route priority
  - Register `router.delete('/patients/bulk-delete', bulkDeletePatients)`
  - No other changes needed; the router-level `requireAuth` + `requireRole(['ADMIN'])` middleware already applies
  - All tests from task 8 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-9, REQ-BPM-10, NFR-SEC-1_
  - _Leverage: `backend/src/routes/admin.routes.ts` (existing route registration pattern)_

---

### Phase 4: Zustand Store (TDD)

- [ ] 10. Write failing Vitest tests for `bulkPatientStore`
  - File to create: `frontend/src/stores/bulkPatientStore.test.ts`
  - Test cases:
    - Initial state: `patients = []`, `loading = false`, `operationLoading = false`, `error = null`, `selectedIds` is an empty Set, `filters` all empty strings
    - `fetchPatients`: sets `loading = true` during fetch, populates `patients` and `summary` on success, sets `error` on failure
    - `fetchPhysicians`: populates `physicians` array on success
    - `filteredPatients()`: returns all patients when no filters active
    - `filteredPatients()`: filters by `physician === '__unassigned__'` returns only unassigned (ownerId null)
    - `filteredPatients()`: filters by physician name (exact match on `ownerName`)
    - `filteredPatients()`: filters by insurance (exact match on `insuranceGroup`)
    - `filteredPatients()`: filters by measure (exact match on `latestMeasure`)
    - `filteredPatients()`: text search filters by `memberName` case-insensitive substring
    - `filteredPatients()`: multiple active filters are ANDed
    - `toggleSelection(id)`: adds ID to Set; calling again removes it
    - `selectAllFiltered()`: adds all IDs from `filteredPatients()` to `selectedIds`
    - `deselectAll()`: clears `selectedIds` to empty Set
    - `toggleAllFiltered()`: selects all if none selected; deselects all if all selected
    - `setFilter(key, value)`: updates the filter and clears `selectedIds`
    - `clearFilters()`: resets all filters and clears `selectedIds`
    - `setOperationLoading(true/false)`: updates `operationLoading`
    - `totalFilteredCount()`: returns correct count from `filteredPatients()`
    - Mock the `api` module (Axios instance)
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-3, REQ-BPM-4, NFR-PERF-2, NFR-PERF-3_
  - _Leverage: `frontend/src/stores/authStore.ts` (Zustand store pattern), `frontend/src/stores/realtimeStore.ts`, `frontend/src/api/axios.ts`_

- [ ] 11. Implement `bulkPatientStore.ts` Zustand store
  - File to create: `frontend/src/stores/bulkPatientStore.ts`
  - Import `create` from `zustand` (no `persist`), import `api` from `../api/axios`
  - Import types from `../types/bulkPatient` (task 1)
  - Define `BulkPatientState` interface matching design.md spec (patients, summary, physicians, filters, selectedIds as `Set<number>`, loading, operationLoading, error, and all action signatures)
  - Implement `filteredPatients()` as a store getter using `get()`: apply physician / insurance / measure / text search filters as AND conditions (exact logic from design.md Client-Side Filtering section)
  - Implement `totalFilteredCount()` as a getter returning `get().filteredPatients().length`
  - Implement `fetchPatients`: call `api.get('/admin/patients')`, set `patients` and `summary` from response, handle error with `setError`
  - Implement `fetchPhysicians`: call `api.get('/users/physicians')`, set `physicians` from response
  - Implement all selection actions: `toggleSelection`, `selectAllFiltered`, `deselectAll`, `toggleAllFiltered`, `clearSelection`
  - Implement `setFilter`: update filter key AND call `deselectAll()` (clears selection on filter change)
  - Implement `clearFilters`: reset all filters to empty strings AND call `deselectAll()`
  - Implement `setOperationLoading`, `setError`
  - All tests from task 10 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-2, REQ-BPM-3, REQ-BPM-4, NFR-PERF-2, NFR-PERF-3_
  - _Leverage: `frontend/src/stores/authStore.ts` (Zustand `create<State>()((set, get) => {...})` pattern)_

---

### Phase 5: Toast Component (TDD)

- [ ] 12. Write failing Vitest tests for `Toast` component
  - File to create: `frontend/src/components/layout/Toast.test.tsx`
  - Test cases:
    - Does not render anything when `isVisible = false`
    - Renders with success styling (green) when `type = 'success'`
    - Renders with error styling (red) when `type = 'error'`
    - Displays the `message` prop text
    - Calls `onDismiss` callback when the close/dismiss button is clicked
    - Calls `onDismiss` after 5 seconds (use `vi.useFakeTimers()` and `vi.advanceTimersByTime(5000)`)
    - When a new toast replaces an existing one (message prop changes), the timer resets
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-11_
  - _Leverage: `frontend/src/components/layout/StatusBar.test.tsx` (Vitest component test pattern)_

- [ ] 13. Implement `Toast.tsx` component
  - File to create: `frontend/src/components/layout/Toast.tsx`
  - Props: `{ message: string; type: 'success' | 'error'; isVisible: boolean; onDismiss: () => void }`
  - If `!isVisible`, return `null`
  - Fixed position: `fixed bottom-4 right-4 z-50`
  - Green background (`bg-green-600 text-white`) for success; red background (`bg-red-600 text-white`) for error
  - Display `message` text
  - Include a close button (X icon or "Dismiss") that calls `onDismiss()`
  - `useEffect` with `setTimeout(onDismiss, 5000)` — cleanup the timer on unmount or when `message`/`isVisible` changes
  - All tests from task 12 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-11, NFR-USE-1_
  - _Leverage: `frontend/src/components/layout/Header.tsx` (layout component pattern), Lucide `X` icon_

---

### Phase 6: Modal Components (TDD)

- [ ] 14. Write failing Vitest tests for `AssignModal` component
  - File to create: `frontend/src/components/modals/AssignModal.test.tsx`
  - Test cases:
    - Does not render when `isOpen = false`
    - Renders title, patient count, and audit note with `adminEmail` when `isOpen = true`
    - Renders physician dropdown with all physicians from `physicians` prop
    - Shows first 10 patients in preview list when > 10 selected
    - Shows "...and N more" text when selected patients exceed 10
    - Confirm button is disabled when no physician is selected in the dropdown
    - Confirm button is enabled after a physician is selected
    - Confirm button is disabled and shows loading when `loading = true`
    - Clicking confirm calls `onConfirm(physicianId)` with the selected physician's id
    - Clicking cancel calls `onClose()`
    - Clicking the backdrop calls `onClose()`
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-6, REQ-BPM-12_
  - _Leverage: `frontend/src/components/modals/ConfirmModal.test.tsx` (modal test pattern)_

- [ ] 15. Implement `AssignModal.tsx` component
  - File to create: `frontend/src/components/modals/AssignModal.tsx`
  - Props: `{ isOpen, patients, physicians, totalCount, adminEmail, loading, onConfirm, onClose }` (as in design.md)
  - Internal state: `selectedPhysicianId: number | null` (reset to null when `isOpen` changes via `useEffect`)
  - If `!isOpen`, return `null`
  - Fixed overlay with backdrop (click-to-close pattern from `ConfirmModal.tsx`)
  - Header: blue-themed icon, "Assign Patients" title, patient count summary
  - Patient preview: `<ul>` showing first 10 patients from `patients` prop (name + current physician), then "...and N more" if `patients.length > 10`; preview list has `max-h-[200px] overflow-y-auto`
  - Physician dropdown: `<select>` with all `physicians` items; onChange sets `selectedPhysicianId`
  - Audit note: `"Recorded in audit log -- {adminEmail}"`
  - Confirm button: disabled when `selectedPhysicianId === null` or `loading === true`; shows `<Loader2>` spinner when `loading`; calls `onConfirm(selectedPhysicianId)` on click
  - Cancel button: calls `onClose()`
  - All tests from task 14 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-6, REQ-BPM-12, NFR-USE-1, NFR-REL-4_
  - _Leverage: `frontend/src/components/modals/ConfirmModal.tsx` (overlay/backdrop pattern), Lucide `Loader2`, `UserCheck` icons_

- [ ] 16. Write failing Vitest tests for `UnassignModal` component
  - File to create: `frontend/src/components/modals/UnassignModal.test.tsx`
  - Test cases:
    - Does not render when `isOpen = false`
    - Renders warning text about unassigned patients not appearing in physician views
    - Renders patient count summary and audit note with `adminEmail`
    - Renders first 10 patients in preview list with physician name
    - Shows "...and N more" when > 10 patients
    - Confirm button is enabled when `isOpen = true` and `loading = false`
    - Confirm button is disabled and shows loading when `loading = true`
    - Clicking "Unassign Patients" calls `onConfirm()`
    - Clicking "Cancel" calls `onClose()`
    - Clicking backdrop calls `onClose()`
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-7, REQ-BPM-12_
  - _Leverage: `frontend/src/components/modals/AssignModal.test.tsx` (task 14 pattern)_

- [ ] 17. Implement `UnassignModal.tsx` component
  - File to create: `frontend/src/components/modals/UnassignModal.tsx`
  - Props: `{ isOpen, patients, totalCount, adminEmail, loading, onConfirm, onClose }` (as in design.md)
  - If `!isOpen`, return `null`
  - Amber/warning-themed design (amber icon, amber confirm button color `bg-amber-600 hover:bg-amber-700`)
  - Warning message: "Unassigned patients will not appear in any physician's view until reassigned"
  - Patient preview: up to 10 patients from `patients` prop showing name + current physician name; "...and N more" overflow; `max-h-[200px] overflow-y-auto`
  - Audit note: `"Recorded in audit log -- {adminEmail}"`
  - Confirm button text: "Unassign Patients"; disabled/loading when `loading = true`; calls `onConfirm()` on click
  - Cancel button: calls `onClose()`
  - Backdrop click: calls `onClose()`
  - All tests from task 16 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-7, REQ-BPM-12, NFR-USE-3, NFR-REL-4_
  - _Leverage: `frontend/src/components/modals/AssignModal.tsx` (task 15 structure), `frontend/src/components/modals/ConfirmModal.tsx`_

- [ ] 18. Write failing Vitest tests for `DeleteModal` component
  - File to create: `frontend/src/components/modals/DeleteModal.test.tsx`
  - Test cases:
    - Does not render when `isOpen = false`
    - Renders danger warning ("This action cannot be undone") and patient count
    - Renders patient preview list (first 10 + "...and N more")
    - Renders audit note with `adminEmail`
    - Confirm button is disabled when `confirmText` input is empty
    - Confirm button is disabled when `confirmText` input is `'delete'` (case-sensitive: must be uppercase)
    - Confirm button is disabled when `confirmText` input is `'DELE'` (incomplete)
    - Confirm button is enabled only when `confirmText` input is exactly `'DELETE'`
    - Confirm button is disabled and shows loading when `loading = true` (even if text is 'DELETE')
    - Clicking confirm (when enabled) calls `onConfirm()`
    - Clicking cancel calls `onClose()`
    - Clicking backdrop calls `onClose()`
    - When `isOpen` transitions from false to true, confirmation input resets to empty
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-8, REQ-BPM-12, NFR-SEC-4_
  - _Leverage: `frontend/src/components/modals/UnassignModal.test.tsx` (task 16 pattern)_

- [ ] 19. Implement `DeleteModal.tsx` component
  - File to create: `frontend/src/components/modals/DeleteModal.tsx`
  - Props: `{ isOpen, patients, totalCount, adminEmail, loading, onConfirm, onClose }` (as in design.md)
  - Internal state: `confirmText: string` (reset to `''` in `useEffect` when `isOpen` becomes true)
  - If `!isOpen`, return `null`
  - Red/danger-themed design (red icon, red confirm button `bg-red-600 hover:bg-red-700`)
  - Warning text: "This action CANNOT be undone. All selected patients and their quality measure records will be permanently deleted."
  - Patient preview: up to 10 patients from `patients` prop showing name + member ID; "...and N more" overflow; `max-h-[200px] overflow-y-auto`
  - Confirmation input: `<input>` with placeholder `'Type DELETE to confirm'`; onChange updates `confirmText` local state
  - Audit note: `"Recorded in audit log -- {adminEmail}"`
  - Confirm button text: "Delete Patients"; disabled when `confirmText !== 'DELETE'` OR `loading === true`; shows `<Loader2>` when loading; calls `onConfirm()` on click
  - Cancel button: calls `onClose()`
  - Backdrop click: calls `onClose()`
  - All tests from task 18 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-8, REQ-BPM-12, NFR-SEC-4, NFR-USE-2, NFR-REL-4_
  - _Leverage: `frontend/src/components/modals/AssignModal.tsx` (task 15 structure), Lucide `Trash2` icon_

---

### Phase 7: BulkOperationsTab Main Component (TDD)

- [ ] 20. Write failing Vitest tests for `BulkOperationsTab` — rendering and loading states
  - File to create: `frontend/src/pages/BulkOperationsTab.test.tsx`
  - Mock `bulkPatientStore` and `useAuthStore`
  - Test cases:
    - Shows loading spinner while `loading = true`
    - Shows empty state message "No patients found. Import patients to get started." when `patients = []` and no filters active
    - Shows "No patients match your filters" message with "Clear Filters" link when filters return 0 results but `patients.length > 0`
    - Renders 4 summary cards with correct labels (Total Patients, Assigned, Unassigned, Insurance Systems)
    - Summary cards display counts from store `summary`
    - Does not fetch data when `isActive = false`
    - Fetches data on first activation (`isActive` transitions to `true`)
    - Does not re-fetch on subsequent activations (hasActivated ref pattern)
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-1, REQ-BPM-13_
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.test.tsx` (isActive/lazy-load test pattern), Vitest mock patterns_

- [ ] 21. Write failing Vitest tests for `BulkOperationsTab` — toolbar and selection
  - File to create: `frontend/src/pages/BulkOperationsTab.test.tsx` (append to task 20 file)
  - Test cases:
    - Toolbar renders "Select All (N)" button with count of filtered patients
    - Toolbar does NOT show "Deselect All" button when `selectedIds` is empty
    - Toolbar shows "Deselect All" (with red tint) when `selectedIds.size > 0`
    - "Assign", "Unassign", "Delete" buttons are disabled (grayed) when `selectedIds` is empty
    - "Assign", "Unassign", "Delete" buttons are enabled and show count "(N)" when patients are selected
    - Clicking "Select All" calls store `selectAllFiltered()`
    - Clicking "Deselect All" calls store `deselectAll()`
    - Clicking "Assign" button (with selection) opens AssignModal
    - Clicking "Unassign" button (with selection) opens UnassignModal
    - Clicking "Delete" button (with selection) opens DeleteModal
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-2, REQ-BPM-3_
  - _Leverage: task 20 test file, `frontend/src/pages/PatientAssignmentPage.test.tsx`_

- [ ] 22. Write failing Vitest tests for `BulkOperationsTab` — table and filtering
  - File to create: `frontend/src/pages/BulkOperationsTab.test.tsx` (append)
  - Test cases:
    - Renders table with columns: checkbox, Patient Name, Member ID, Physician, Measure, Status, Insurance, Updated
    - Renders one row per patient from `filteredPatients()`
    - Shows "Unassigned" badge for patients with `ownerId = null`
    - Table footer shows "N patients" count (locale-formatted)
    - Table footer shows "M of N selected" when patients are selected
    - Header checkbox checked when all filtered patients are selected; unchecked otherwise
    - Clicking header checkbox calls store `toggleAllFiltered()`
    - Clicking a row calls store `toggleSelection(id)`
    - Selected rows have a distinct blue-tint CSS class
    - Filter dropdowns (physician, insurance, measure) call `setFilter` on change
    - Search input calls `setFilter('search', value)` on input
    - "Clear" button calls store `clearFilters()`
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-3, REQ-BPM-4, REQ-BPM-5, NFR-USE-4, NFR-USE-5, NFR-USE-6, NFR-USE-7_
  - _Leverage: task 20 test file, `frontend/src/pages/PatientAssignmentPage.test.tsx`_

- [ ] 23. Implement `BulkOperationsTab.tsx` — structure, summary cards, and lazy-loading
  - File to create: `frontend/src/pages/BulkOperationsTab.tsx`
  - Props: `{ isActive: boolean }`
  - Import `useBulkPatientStore` from `../stores/bulkPatientStore`, `useAuthStore` from `../stores/authStore`
  - `hasActivated` ref (same pattern as `ReassignTabContent`)
  - `useEffect([isActive])`: if `isActive && !hasActivated.current` → set `hasActivated.current = true` → call `store.fetchPatients()` and `store.fetchPhysicians()`
  - Render 4 summary cards in a responsive grid (`grid-cols-4 sm:grid-cols-2 grid-cols-1`): Total Patients, Assigned, Unassigned, Insurance Systems — values from `store.summary`
  - Show `<Loader2>` spinner centered in table area when `store.loading`
  - Show empty-state message when `store.patients.length === 0 && !store.loading`
  - Show "no filter results" state when `store.filteredPatients().length === 0 && store.patients.length > 0`
  - All tests from tasks 20-22 will drive the remaining implementation in tasks 24-26
  - _Requirements: REQ-BPM-1, REQ-BPM-13, NFR-USE-8, NFR-USE-9_
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.tsx` (`ReassignTabContent` lazy-load pattern), Lucide `Loader2`_

- [ ] 24. Implement `BulkOperationsTab.tsx` — toolbar with action buttons
  - File to modify: `frontend/src/pages/BulkOperationsTab.tsx` (continue from task 23)
  - Toolbar layout: left side (Select All / Deselect All), visual divider, right side (Assign / Unassign / Delete)
  - "Select All (N)" button: always visible; N = `store.totalFilteredCount()` formatted with `Intl.NumberFormat`; onClick → `store.selectAllFiltered()`; hide when all filtered patients are already selected (show only Deselect All)
  - "Deselect All" button: only visible when `store.selectedIds.size > 0`; red-tint styling; onClick → `store.deselectAll()`
  - "Assign (N)" button: blue styling (`bg-blue-600`); disabled when `selectedIds.size === 0`; N = `selectedIds.size` formatted; onClick → `setAssignOpen(true)`
  - "Unassign (N)" button: amber styling (`bg-amber-600`); disabled when `selectedIds.size === 0`; onClick → `setUnassignOpen(true)`
  - "Delete (N)" button: red styling (`bg-red-600`); disabled when `selectedIds.size === 0`; onClick → `setDeleteOpen(true)`
  - Local state: `assignOpen`, `unassignOpen`, `deleteOpen` (boolean)
  - Toast state: `toast: { message: string; type: 'success' | 'error'; isVisible: boolean }`
  - All toolbar tests from task 21 must pass (GREEN phase)
  - _Requirements: REQ-BPM-2, REQ-BPM-3, NFR-USE-1_
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.tsx` (button pattern), Lucide `UserCheck`, `UserMinus`, `Trash2` icons_

- [ ] 25. Implement `BulkOperationsTab.tsx` — filter bar and scrollable patient table
  - File to modify: `frontend/src/pages/BulkOperationsTab.tsx` (continue from task 24)
  - Filter bar: four controls in a row — Physician `<select>`, Insurance `<select>`, Measure `<select>`, text search `<input>`, plus "Clear" button
  - Physician dropdown options: "All Physicians", "Unassigned" (value `'__unassigned__'`), then one option per distinct physician name derived from `store.patients`
  - Insurance dropdown options: "All Insurance", then one option per distinct `insuranceGroup` from `store.patients`
  - Measure dropdown options: "All Measures", then one option per distinct `latestMeasure` from `store.patients`
  - Each dropdown onChange calls `store.setFilter(key, value)` (which auto-clears selection)
  - Search input onChange calls `store.setFilter('search', value)`
  - "Clear" button onClick calls `store.clearFilters()`
  - Patient table: `<table>` with `<thead>` using `position: sticky top: 0 bg-white z-10`; `<tbody>` wrapped in a `max-h-[600px] overflow-y-auto` container
  - Table columns: checkbox, Patient Name, Member ID, Physician (or "Unassigned" italic red badge), Measure, Status, Insurance, Updated date
  - Map `store.filteredPatients()` to `<tr>` rows; each row has `onClick={() => store.toggleSelection(p.id)}`; selected rows get `bg-blue-50` class
  - Row checkbox: `checked={store.selectedIds.has(p.id)}`; `onChange={() => store.toggleSelection(p.id)}`; `onClick` stopPropagation
  - Header checkbox: `checked={allSelected}` where `allSelected = filteredCount > 0 && selectedIds.size === filteredCount`; `onChange={() => store.toggleAllFiltered()}`
  - Table footer: "N patients" (total matching filters); if `selectedIds.size > 0` also show "M of N selected"
  - Numbers use `Intl.NumberFormat().format(n)`
  - All table/filter tests from task 22 must pass (GREEN phase)
  - _Requirements: REQ-BPM-4, REQ-BPM-5, NFR-USE-4, NFR-USE-5, NFR-USE-6, NFR-USE-7, NFR-USE-10, NFR-PERF-5_
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.tsx` (table and checkbox pattern), `frontend/src/stores/bulkPatientStore.ts`_

- [ ] 26. Implement `BulkOperationsTab.tsx` — modal wiring and bulk operation handlers
  - File to modify: `frontend/src/pages/BulkOperationsTab.tsx` (continue from task 25)
  - Import `AssignModal`, `UnassignModal`, `DeleteModal`, `Toast` components
  - Derive `selectedPatients: BulkPatient[]` from `store.filteredPatients().filter(p => store.selectedIds.has(p.id))`
  - Derive `adminEmail` from `useAuthStore().user?.email ?? ''`
  - Handler `handleAssignConfirm(physicianId)`:
    - Call `store.setOperationLoading(true)`
    - Call `api.patch('/admin/patients/bulk-assign', { patientIds: [...store.selectedIds], ownerId: physicianId })`
    - On success: close modal (`setAssignOpen(false)`), `store.deselectAll()`, `store.fetchPatients()`, show success toast
    - On error: show error toast, keep modal open
    - Finally: `store.setOperationLoading(false)`
  - Handler `handleUnassignConfirm()`:
    - Same pattern but `ownerId: null` in the PATCH body
  - Handler `handleDeleteConfirm()`:
    - Call `store.setOperationLoading(true)`
    - Call `api.delete('/admin/patients/bulk-delete', { data: { patientIds: [...store.selectedIds] } })`
    - On success: close modal, `store.deselectAll()`, `store.fetchPatients()`, show success toast
    - On error: show error toast, keep modal open
    - Finally: `store.setOperationLoading(false)`
  - Render `<AssignModal>`, `<UnassignModal>`, `<DeleteModal>` with correct props
  - Render `<Toast>` with toast state; `onDismiss` sets `toast.isVisible = false`
  - Error handling: on API failure, display error toast with `err.response?.data?.error?.message || 'Operation failed'`
  - _Requirements: REQ-BPM-6, REQ-BPM-7, REQ-BPM-8, REQ-BPM-11, REQ-BPM-13, NFR-REL-3, NFR-REL-4_
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.tsx` (API call + error handling pattern), `frontend/src/api/axios.ts`_

---

### Phase 8: Parent Page Integration (TDD)

- [ ] 27. Write failing Vitest tests for `PatientManagementPage` — Bulk Operations tab
  - File to modify: `frontend/src/pages/PatientManagementPage.test.tsx`
  - Test cases (add to existing test file):
    - "Bulk Operations" tab button is visible when user has ADMIN role
    - "Bulk Operations" tab button is NOT visible when user is non-ADMIN (PHYSICIAN or STAFF)
    - Clicking "Bulk Operations" tab updates URL search params to `?tab=bulk-ops`
    - Navigating to `?tab=bulk-ops` renders `BulkOperationsTab` content area as active
    - `document.title` is set to `'Patient Management - Bulk Operations'` when tab is `'bulk-ops'`
    - Other tabs still render correctly when admin navigates away from bulk-ops
  - Mock `BulkOperationsTab` component to avoid deep rendering
  - Tests MUST fail before implementation (RED phase)
  - _Requirements: REQ-BPM-1, NFR-SEC-2, NFR-USE-9_
  - _Leverage: `frontend/src/pages/PatientManagementPage.test.tsx` (existing tab tests to build on)_

- [ ] 28. Integrate `BulkOperationsTab` into `PatientManagementPage.tsx`
  - File to modify: `frontend/src/pages/PatientManagementPage.tsx`
  - Add import: `import { BulkOperationsTab } from './BulkOperationsTab'`
  - Add `'bulk-ops'` to `validTabs` array (admin-only, same guard as `'reassign'`)
  - Add `{ id: 'bulk-ops', label: 'Bulk Operations' }` to `tabs` array inside the admin guard
  - Add the `document.title` case for `'bulk-ops'`: `'Patient Management - Bulk Operations'`
  - Add tab content block: inside the `isAdmin` guard, render `<div className={activeTab === 'bulk-ops' ? 'tab-visible' : 'tab-hidden'}><BulkOperationsTab isActive={activeTab === 'bulk-ops'} /></div>`
  - All tests from task 27 must now pass (GREEN phase)
  - _Requirements: REQ-BPM-1, NFR-SEC-2, NFR-USE-9_
  - _Leverage: `frontend/src/pages/PatientManagementPage.tsx` (existing tab registration pattern for 'reassign')_

---

### Phase 9: End-to-End Tests

- [ ] 29. Write Cypress E2E tests for bulk operations tab visibility and data loading
  - File to create: `frontend/cypress/e2e/bulk-operations.cy.ts`
  - Test cases:
    - Admin user sees "Bulk Operations" tab on Patient Management page
    - Physician user does NOT see "Bulk Operations" tab
    - Clicking "Bulk Operations" tab loads the page and shows summary cards
    - Summary cards show non-zero "Total Patients" count
    - Patient table renders with expected column headers
    - Table footer shows patient count
  - Use existing Cypress login helpers and `cy.visit('/patients')` pattern
  - _Requirements: REQ-BPM-1, REQ-BPM-5, NFR-SEC-2_
  - _Leverage: `frontend/cypress/e2e/` (existing specs for login/navigation patterns), `frontend/cypress/support/commands.ts`_

- [ ] 30. Write Cypress E2E tests for selection and filter interactions
  - File to modify: `frontend/cypress/e2e/bulk-operations.cy.ts` (append)
  - Test cases:
    - Clicking a patient row selects it and applies blue-tint class to the row
    - "Assign", "Unassign", "Delete" buttons become enabled after row selection
    - Clicking "Select All" selects all visible patients and updates button labels with count
    - Clicking "Deselect All" clears selection and hides the Deselect All button
    - Header checkbox click selects/deselects all visible patients
    - Filtering by physician updates the visible patient rows
    - Searching by name shows only matching patients
    - Clicking "Clear" resets filters and restores full patient list
    - Changing a filter clears any existing selection
  - _Requirements: REQ-BPM-2, REQ-BPM-3, REQ-BPM-4_
  - _Leverage: task 29 test file setup, `frontend/cypress/support/commands.ts`_

- [ ] 31. Write Cypress E2E tests for assign modal flow
  - File to modify: `frontend/cypress/e2e/bulk-operations.cy.ts` (append)
  - Test cases:
    - Selecting patients and clicking "Assign" opens the Assign modal
    - Assign modal displays patient count and preview list
    - Assign modal confirm button is disabled until a physician is selected in the dropdown
    - Selecting a physician enables the confirm button
    - Confirming assign closes the modal and shows a success toast
    - Success toast contains the physician's name and patient count
    - After assign, table refreshes and selection is cleared
    - Closing the modal without confirming leaves patient list unchanged
  - _Requirements: REQ-BPM-6, REQ-BPM-11, REQ-BPM-12_
  - _Leverage: task 30 test file setup_

- [ ] 32. Write Cypress E2E tests for unassign modal flow
  - File to modify: `frontend/cypress/e2e/bulk-operations.cy.ts` (append)
  - Test cases:
    - Clicking "Unassign" with selection opens the Unassign modal with amber warning styling
    - Unassign modal shows warning message about patients becoming invisible to physicians
    - "Unassign Patients" confirm button is enabled immediately (no extra confirmation required)
    - Confirming unassign closes the modal and shows success toast
    - After unassign, table refreshes with updated physician assignments
    - Cancelling unassign modal leaves data unchanged
  - _Requirements: REQ-BPM-7, REQ-BPM-11_
  - _Leverage: task 31 test file setup_

- [ ] 33. Write Cypress E2E tests for delete modal flow
  - File to modify: `frontend/cypress/e2e/bulk-operations.cy.ts` (append)
  - Test cases:
    - Clicking "Delete" with selection opens the Delete modal with red/danger styling
    - Delete modal shows "cannot be undone" warning
    - Confirm button is disabled when the confirmation input is empty
    - Confirm button remains disabled with lowercase `'delete'` input (case-sensitive)
    - Confirm button becomes enabled only when `'DELETE'` (all caps) is typed
    - Confirming delete closes modal and shows success toast with deleted count
    - After delete, selected patients no longer appear in the table
    - Cancelling delete modal leaves patient list unchanged
    - Re-opening the delete modal after close resets the confirmation input to empty
  - _Requirements: REQ-BPM-8, REQ-BPM-11, NFR-SEC-4_
  - _Leverage: task 32 test file setup_

- [ ] 34. Write Playwright E2E tests for bulk operations navigation and full workflows
  - File to create: `frontend/e2e/bulk-operations.spec.ts`
  - Test cases:
    - Admin can navigate to Bulk Operations tab via URL `?tab=bulk-ops`
    - Page title updates to "Patient Management - Bulk Operations"
    - Full delete workflow: select patients → open modal → type 'DELETE' → confirm → verify toast → verify patients removed
    - Full assign workflow: select patients → open modal → select physician → confirm → verify success toast
    - Toast notification auto-dismisses after 5 seconds (use `page.waitForTimeout` or timer assertion)
    - Empty state renders when no patients exist (seed an empty-patient environment)
  - Use Playwright Page Object Model pattern consistent with `frontend/e2e/pages/`
  - _Requirements: REQ-BPM-6, REQ-BPM-8, REQ-BPM-11, REQ-BPM-13_
  - _Leverage: `frontend/e2e/` (existing Playwright spec files and Page Object patterns)_

---

### Phase 10: Visual Review (Layer 5)

- [ ] 35. Perform MCP Playwright visual review of Bulk Operations tab
  - Use the `ui-ux-reviewer` agent to open the running application in a real browser
  - Verify the following visually (screenshots required):
    - Summary cards layout: 4 columns on desktop, 2 on tablet, 1 on mobile
    - Toolbar: correct button colors (blue Assign, amber Unassign, red Delete); disabled state (grayed) when no selection
    - Table: sticky headers remain visible while scrolling; row hover highlight; selected row blue tint
    - "Unassigned" badge: red-tinted italic style for unassigned physician column
    - Filter bar: all four controls in a row, clear button visible
    - AssignModal: blue-themed, patient preview list with scrollbar when > 10 patients, physician dropdown
    - UnassignModal: amber-themed warning, patient preview, confirm button
    - DeleteModal: red/danger-themed, "DELETE" input field, preview list, disabled button until text matches
    - Toast: bottom-right corner placement, green for success, red for error
    - Numbers display locale-formatted (e.g., "1,247" not "1247")
  - _Requirements: NFR-USE-1 through NFR-USE-10_
  - _Leverage: `.claude/agent-memory/ui-ux-reviewer/` (visual review agent)_

---

## Dependency Chain Overview

```
Task 1 (Types)
  ↓
Tasks 2-3 (getAllPatients handler: test → implement)
Tasks 4-5 (bulkDeletePatients handler: test → implement)
Tasks 6-7 (bulkAssignPatients Socket.IO: test → implement)
  ↓
Tasks 8-9 (Route registration: test → implement)
  ↓
Tasks 10-11 (Zustand store: test → implement)
  ↓
Tasks 12-13 (Toast: test → implement)
Tasks 14-15 (AssignModal: test → implement)
Tasks 16-17 (UnassignModal: test → implement)
Tasks 18-19 (DeleteModal: test → implement)
  ↓
Tasks 20-26 (BulkOperationsTab: test → implement, in sub-phases)
  ↓
Tasks 27-28 (Parent page integration: test → implement)
  ↓
Tasks 29-34 (Cypress + Playwright E2E)
  ↓
Task 35 (Visual review)
```

## Estimated Implementation Phases

| Phase | Tasks | Estimated Time | Description |
|-------|-------|---------------|-------------|
| 1 — Types | 1 | 15 min | TypeScript type definitions |
| 2 — Backend Handlers | 2-7 | 2.5 hr | New handlers + Socket.IO broadcasts (TDD) |
| 3 — Routes | 8-9 | 30 min | Route registration + auth tests |
| 4 — Store | 10-11 | 1.5 hr | Zustand store with filtering logic (TDD) |
| 5 — Toast | 12-13 | 30 min | Toast notification component (TDD) |
| 6 — Modals | 14-19 | 2.5 hr | Three modal components (TDD) |
| 7 — Main Tab | 20-26 | 3 hr | BulkOperationsTab with table + wiring (TDD) |
| 8 — Integration | 27-28 | 45 min | Parent page tab registration (TDD) |
| 9 — E2E Tests | 29-34 | 2 hr | Cypress + Playwright flows |
| 10 — Visual Review | 35 | 45 min | Layer 5 browser review |

**Total: approximately 14 hours of implementation work across 35 atomic tasks**

## Key Reuse Points from Existing Codebase

| New Component/Handler | Reuses |
|----------------------|--------|
| `getAllPatients` handler | `getUnassignedPatients` function structure, `prisma` import from `database.ts` |
| `bulkDeletePatients` handler | `bulkAssignPatients` transaction + audit log pattern |
| `admin.routes.ts` registration | Existing router-level auth middleware (no new middleware needed) |
| `bulkPatientStore.ts` | `authStore.ts` `create<State>()((set, get) => {...})` pattern; `api` from `axios.ts` |
| `BulkOperationsTab.tsx` | `ReassignTabContent` `hasActivated` ref, `Set<number>` selection, table layout |
| `AssignModal.tsx` / `UnassignModal.tsx` / `DeleteModal.tsx` | `ConfirmModal.tsx` fixed overlay, backdrop click-to-close, button styling |
| `Toast.tsx` | Lucide icons, Tailwind fixed positioning utilities |
| `PatientManagementPage.tsx` changes | Existing `'reassign'` tab admin-only guard pattern |
