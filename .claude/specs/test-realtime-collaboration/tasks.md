# Implementation Plan: test-realtime-collaboration

## Task Overview

Write 29 new tests and 1 code fix across 11 task groups to fill coverage gaps in the Real-Time Collaboration module (Module 6: Parallel Editing). One task is a P0 code fix (reconnect room re-join). All other tasks add tests only -- no production code changes.

**Test distribution:**
- T1-1: 1 code fix + 1 Vitest test -- P0 reconnect room re-join feature gap (CODE FIX)
- T1-2: 3 Backend Jest tests -- Disconnect handler broadcast + stale edit lock cleanup
- T2-1: 4 Backend Jest tests -- Room join/leave/auth event handlers
- T2-2: 1 Backend Jest test -- Server initialization test
- T3-1: 4 Frontend Vitest tests -- PatientGrid remote row update/delete handling
- T3-2: 3 Frontend Vitest tests -- Conflict resolution integration (409 -> modal -> action)
- T3-3: 3 Frontend Vitest tests -- Cascade, presence self-filter, rapid edit versioning
- T4-1: 3 Backend Jest tests -- Import route broadcast + audit trail
- T4-2: 2 Backend Jest tests -- Type safety payload assertions
- T5-1: 5 Playwright E2E tests -- Multi-context collaboration scenarios
- T5-2: 1 Cypress E2E test -- Cell flash animation trigger from remote event

**Grand total: 29 new tests + 1 code fix = 30 deliverables**

## Steering Document Compliance

- Backend Jest files follow the ESM pattern: `jest.unstable_mockModule` + dynamic `import()` (see `versionCheck.test.ts`, `data.routes.socket.test.ts`)
- Frontend Vitest files follow patterns in `socketService.test.ts`, `useSocket.test.ts`, `PatientGrid.test.tsx`
- Playwright E2E files use the `MainPage` Page Object Model from `frontend/e2e/pages/main-page.ts`
- Cypress tests use custom commands: `cy.login()`, `cy.waitForAgGrid()`, `cy.getAgGridCell()`
- Seed accounts: `ko037291@gmail.com` (admin), `phy1@gmail.com` (physician), `staff1@gmail.com` (staff) -- password: `welcome100`
- Socket types reference `GridRowPayload` from `frontend/src/types/socket.ts` -- `tracking1` and `tracking2` only (no `tracking3`, no `depressionScreeningStatus`)
- All E2E tests use explicit waits (Playwright: `expect().toContainText({ timeout })`, Cypress: `should()` auto-retry) -- never `sleep()` or fixed timeouts
- Playwright browser contexts cleaned up in `finally` blocks

## Atomic Task Requirements

Each task meets these criteria:
- **File Scope**: 1-2 files created or extended per task
- **Time Boxing**: 15-45 minutes depending on complexity
- **Single Purpose**: One behavioral area per task
- **Specific Files**: Exact paths listed
- **Agent-Friendly**: Includes run command to verify passing

---

## Tasks

### Task T1-1: P0 FEATURE FIX -- WebSocket reconnect re-joins physician room and triggers data refresh

- **Priority**: P0-CRITICAL
- **Framework**: Vitest (test) + Production code fix (socketService.ts / useSocket.ts)
- **Files to modify**:
  - `frontend/src/hooks/useSocket.ts` (production fix)
  - `frontend/src/hooks/useSocket.test.ts` (extend with 1 new test)
- **Tests to Write**: 1
- **Description**: The `socketService.ts` `reconnect` handler (line 95-97) only calls `handlers.onConnectionChange('connected')`. It does NOT re-join the physician room or trigger a data refresh. After a network blip, the client reconnects to Socket.IO but is no longer in any room -- it silently receives no further room-scoped events (`row:updated`, `presence:update`, etc.). This is a P0 feature gap: the user sees "Connected" but gets stale data with no indication of the problem.

  **Fix approach**: In `useSocket.ts`, update `handleConnectionChange` so that when status transitions from `disconnected`/`reconnecting` to `connected`, it calls `socketService.joinRoom(selectedPhysicianId)` (if non-null) and calls `optionsRef.current.onDataRefresh()`. This mirrors what happens on initial mount but is triggered on reconnection.

  **TDD sequence**:
  1. **RED**: Write a failing test in `useSocket.test.ts` that simulates: (a) initial connect, (b) disconnect event, (c) reconnect event (onConnectionChange('connected') after 'disconnected'), then asserts `joinRoom` was called again AND `onDataRefresh` was called.
  2. **GREEN**: Modify `useSocket.ts` `handleConnectionChange` to detect the `disconnected -> connected` transition and call `joinRoom()` + `onDataRefresh()`.
  3. **REFACTOR**: Ensure the room re-join does not double-fire on initial connect (only on reconnect after a previous disconnect).

- **Acceptance Criteria**:
  - [ ] Failing test written showing reconnect does NOT re-join room (RED)
  - [ ] `useSocket.ts` modified to re-join room + refresh data on reconnect (GREEN)
  - [ ] Test passes after fix
  - [ ] Initial connect does NOT double-fire joinRoom (no regression)
  - [ ] All existing `useSocket.test.ts` tests still pass
- **Dependencies**: None (first task)
- **Estimated Effort**: M
- **Traceability**: TRC-R8-AC3, TRC-R8-T1, Gap: "useSocket.ts does NOT re-join room on reconnect"

---

### Task T1-2: P0 -- Disconnect handler broadcasts editing:inactive + stale edit lock cleanup

- **Priority**: P0-CRITICAL
- **Framework**: Backend Jest
- **Target File**: `backend/src/services/__tests__/socketManager.test.ts` (extend)
- **Tests to Write**: 3
- **Description**: When a user disconnects unexpectedly, the backend must broadcast `editing:inactive` events for each edit that user had active, so other clients clear the phantom edit indicators. Additionally, if `editing:start` is received but no `editing:stop` arrives within a timeout, the edit should eventually be cleared (stale lock cleanup). The `clearEditsForSocket()` helper is unit-tested but the disconnect handler that calls it and broadcasts the results is NOT tested.

  **Test list**:
  1. `disconnect handler calls clearEditsForSocket and broadcasts editing:inactive for each cleared edit` -- Set up a socket with 2 active edits in a room. Simulate disconnect. Assert `clearEditsForSocket(socketId)` is called, and for each cleared edit, `editing:inactive` is broadcast to the room with the correct `{ rowId, field }`.
  2. `disconnect handler removes user from all rooms and broadcasts presence:update` -- Set up a socket in 2 rooms. Simulate disconnect. Assert `removeUserFromAllRooms(socketId)` is called, and each affected room receives a `presence:update` broadcast.
  3. `stale edit lock cleanup clears edit after timeout with no editing:stop` -- Call `addActiveEdit(socketId, room, { rowId: 1, field: 'notes', userName: 'Test' })`. Wait for the stale lock timeout (or mock timer). Assert the edit is cleared and `editing:inactive` is broadcast. If no stale lock timeout exists in the current code, this test documents the gap and should be marked as a known limitation.

- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] No regressions in existing `socketManager.test.ts` (20 tests)
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R5-AC8, TRC-R5-T1, TRC-R5-T5, TRC-R3-AC4

---

### Task T2-1: HIGH -- Backend room:join/leave/auth event handlers

- **Priority**: P1-HIGH
- **Framework**: Backend Jest
- **Target File**: `backend/src/services/__tests__/socketManager.test.ts` (extend)
- **Tests to Write**: 4
- **Description**: The `handleRoomJoin()` and `handleRoomLeave()` event handlers in `socketManager.ts` are the entry points for room management but are NOT tested. The existing tests cover the helper functions (`addUserToRoom`, `removeUserFromRoom`, `getRoomName`) but not the Socket.IO event handler wiring. Additionally, room authorization for STAFF users is not tested.

  **Test list**:
  1. `room:join handler joins socket to correct room and broadcasts presence:update` -- Emit `room:join` with `{ physicianId: 5 }`. Assert socket joins `'physician:5'` room, `addUserToRoom()` is called, and `presence:update` is broadcast to the room.
  2. `room:join handler rejects unauthorized STAFF user` -- Set up a socket with `roles: ['STAFF']` and `assignedPhysicianIds: [3]`. Emit `room:join` with `{ physicianId: 5 }`. Assert join is rejected (socket does NOT join room, error callback or event sent).
  3. `room:leave handler removes socket from room and broadcasts presence:update` -- Emit `room:leave` with `{ physicianId: 5 }`. Assert socket leaves `'physician:5'` room, `removeUserFromRoom()` is called, `presence:update` is broadcast, and active edits for that socket in that room are cleared.
  4. `room:join with physicianId 'unassigned' joins physician:unassigned room` -- Emit `room:join` with `{ physicianId: 'unassigned' }`. Assert socket joins `'physician:unassigned'` room.

- **Acceptance Criteria**:
  - [ ] 4 tests written and passing
  - [ ] No regressions in existing `socketManager.test.ts`
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R2-AC7, TRC-R2-AC8, TRC-R2-T1, TRC-R2-T2, TRC-R2-T3

---

### Task T2-2: LOW -- Server initialization test

- **Priority**: P3-LOW
- **Framework**: Backend Jest
- **Target File**: `backend/src/services/__tests__/socketManager.test.ts` (extend)
- **Tests to Write**: 1
- **Description**: Verify `initializeSocketIO()` creates the Socket.IO server with correct CORS config, registers `socketAuthMiddleware`, and calling it twice returns the same instance (singleton behavior).

  **Test list**:
  1. `initializeSocketIO creates Socket.IO server with CORS config and singleton behavior` -- Call `initializeSocketIO(httpServer)`. Assert `new Server()` is called with CORS origins for dev and production. Call again with same httpServer, assert same instance returned.

- **Acceptance Criteria**:
  - [ ] 1 test written and passing
  - [ ] No regressions in existing `socketManager.test.ts`
- **Dependencies**: None
- **Estimated Effort**: S
- **Traceability**: TRC-R1-AC1, TRC-R1-T1

---

### Task T3-1: HIGH -- PatientGrid remote row update/delete handling

- **Priority**: P1-HIGH
- **Framework**: Frontend Vitest
- **Target File**: `frontend/src/components/grid/PatientGrid.test.tsx` (extend)
- **Tests to Write**: 4
- **Description**: The `handleRemoteRowUpdate` and `handleRemoteRowDelete` callbacks in PatientGrid are not adequately tested. Key gaps: out-of-order broadcast rejection (older `updatedAt` discarded), in-place `setData()` call verification, selection clear on row delete, and multiple concurrent edit indicators on the same row.

  **Test list**:
  1. `handleRemoteRowUpdate calls node.setData() for matching row without changing scroll position` -- Mock AG Grid API with `getRowNode(id)` returning a node mock. Call `onRowUpdated` handler with a matching row. Assert `node.setData()` called with the updated data. Assert `ensureIndexVisible` or `setFocusedCell` was NOT called.
  2. `handleRemoteRowUpdate discards broadcast with older updatedAt` -- Set up a row with `updatedAt: '2026-02-27T10:00:00Z'`. Call `onRowUpdated` with the same row ID but `updatedAt: '2026-02-27T09:00:00Z'`. Assert `node.setData()` was NOT called.
  3. `handleRemoteRowDelete removes row and clears selection if row was selected` -- Mock AG Grid API with `getRowNode(id)` returning a node. Set selection to include that row. Call `onRowDeleted` handler. Assert the row node is removed and selection is cleared.
  4. `cellClass returns cell-remote-editing independently for multiple cells on the same row` -- Add two active edits for the same row but different fields (`notes` and `measureStatus`) to `realtimeStore.activeEdits`. Call the `cellClass` callback for each field. Assert both return `'cell-remote-editing'` independently. Call for a third field (`tracking1`). Assert it does NOT return the class.

- **Acceptance Criteria**:
  - [ ] 4 tests written and passing
  - [ ] No regressions in existing `PatientGrid.test.tsx` (58 tests)
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R4-AC5, TRC-R4-AC9, TRC-R4-AC8, TRC-R5-AC9, TRC-R4-T5, TRC-R4-T6, TRC-R4-T7, TRC-R5-T3

---

### Task T3-2: MEDIUM -- Conflict resolution integration (409 -> modal -> action)

- **Priority**: P2-MEDIUM
- **Framework**: Frontend Vitest
- **Target File**: `frontend/src/components/grid/PatientGrid.test.tsx` (extend)
- **Tests to Write**: 3
- **Description**: The ConflictModal unit tests verify rendering and callback invocation, but the integration between a 409 HTTP response and the modal opening, plus the downstream actions (forceOverwrite PUT, cell revert), is not tested. These tests verify the PatientGrid wiring.

  **Test list**:
  1. `409 VERSION_CONFLICT response opens ConflictModal with correct conflict data` -- Mock `axios.put` to return a 409 response with `{ code: 'VERSION_CONFLICT', serverRow, conflictFields, changedBy }`. Trigger a cell edit save. Assert the ConflictModal becomes visible with the correct patient name, field name, and values.
  2. `Keep Mine callback sends second PUT with forceOverwrite: true` -- After opening the modal via 409, simulate clicking "Keep Mine". Assert `axios.put` was called a second time with `forceOverwrite: true` in the request body.
  3. `Keep Theirs callback reverts cell to server value and makes no API call` -- After opening the modal via 409, record the mock call count. Simulate clicking "Keep Theirs". Assert the cell value reverts to `serverRow[field]`. Assert `axios.put` was NOT called again (call count unchanged).

- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] No regressions in existing PatientGrid and ConflictModal tests
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R6-AC7, TRC-R6-AC8, TRC-R6-T1, TRC-R6-T2, TRC-R6-T3

---

### Task T3-3: HIGH -- Cascade edit, presence self-filter, rapid edit versioning

- **Priority**: P1-HIGH (mixed -- cascade is P1, others are P2/P1)
- **Framework**: Frontend Vitest
- **Target Files**:
  - `frontend/src/hooks/useSocket.test.ts` (extend with 1 test)
  - `frontend/src/components/grid/PatientGrid.test.tsx` (extend with 2 tests)
- **Tests to Write**: 3
- **Description**: Three independent Vitest gaps that don't warrant their own tasks. (a) The `onPresenceUpdate` handler in `useSocket.ts` filters out the current user, but the test passes already-filtered data -- the filter logic itself is untested. (b) Cascade updates that clear multiple fields while a user is editing need to cancel the edit and show a notification. (c) Rapid sequential edits must track `updatedAt` from each response to avoid self-conflicts.

  **Test list**:
  1. `onPresenceUpdate filters out the current user before calling setRoomUsers` -- Set `useAuthStore.getState().user.id = 99`. Call `onPresenceUpdate` with `{ users: [{ id: 99, displayName: 'Me' }, { id: 100, displayName: 'Other' }] }`. Assert `setRoomUsers` was called with `[{ id: 100, displayName: 'Other' }]` only. *(Extend `useSocket.test.ts`)*
  2. `handleRemoteRowUpdate on actively-edited row exits edit mode and shows notification` -- Set up PatientGrid with a cell in edit mode (mock `gridApi.getEditingCells()` returning the cell). Call `onRowUpdated` for that row with multiple fields set to null (cascade). Assert `gridApi.stopEditing(true)` was called and a toast/notification function was invoked. *(Extend `PatientGrid.test.tsx`)*
  3. `rapid sequential edits use updatedAt from latest API response` -- Mock `axios.put` to return incrementing `updatedAt` timestamps. Trigger 3 sequential cell saves on the same row. Assert each PUT request body contains the `expectedVersion` from the previous response, not the original mount value. *(Extend `PatientGrid.test.tsx`)*

- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] No regressions in existing `useSocket.test.ts` (17 tests) or `PatientGrid.test.tsx` (58 tests)
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R3-AC8, TRC-R3-T1, TRC-R9-AC1, TRC-R9-T1, TRC-R11-AC2, TRC-R11-T2

---

### Task T4-1: MEDIUM -- Import route broadcast + audit trail completeness

- **Priority**: P2-MEDIUM
- **Framework**: Backend Jest
- **Target Files**:
  - `backend/src/routes/__tests__/import.routes.test.ts` (extend or create)
  - `backend/src/routes/__tests__/data.routes.version.test.ts` (extend)
- **Tests to Write**: 3
- **Description**: Import route broadcast emission is not tested at the route level. Also, audit trail tests don't verify field-level detail for normal saves or that "Keep Theirs" produces no audit entry.

  **Test list**:
  1. `POST /api/import/execute emits import:started and import:completed to affected room` -- Mock `broadcastToRoom`. Call the import execute endpoint. Assert `broadcastToRoom` was called with `import:started` (with `importedBy`) before execution and `import:completed` (with `importedBy` + `stats`) after execution. *(Extend or create import route test file)*
  2. `normal save audit log includes field-level changes with old and new values` -- PUT with a field change that succeeds. Assert the audit log `createAuditLog` call includes `changes.fields` array with `{ field, oldValue, newValue }` entries. *(Extend `data.routes.version.test.ts`)*
  3. `Keep Theirs resolution produces no additional audit entry` -- Simulate a 409 conflict, then verify that if no second PUT is made (Keep Theirs / Cancel), no additional audit log is created. This is a frontend Vitest test verifying no API call, but placed here to verify the backend contract: audit entries only exist for actual PUTs. *(Extend `data.routes.version.test.ts` -- verify no audit for a PUT that never happens by asserting `createAuditLog` call count matches the number of actual PUTs)*

- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] No regressions in existing test files
- **Dependencies**: None
- **Estimated Effort**: M
- **Traceability**: TRC-R7-AC1, TRC-R7-AC2, TRC-R7-T1, TRC-R10-AC1, TRC-R10-AC3, TRC-R10-T1, TRC-R10-T3

---

### Task T4-2: MEDIUM -- Type safety payload assertions

- **Priority**: P2-MEDIUM
- **Framework**: Backend Jest
- **Target File**: `backend/src/services/__tests__/versionCheck.test.ts` (extend)
- **Tests to Write**: 2
- **Description**: The `toGridRowPayload()` function tests verify basic fields and `insuranceGroup` but do not assert the absence of removed fields (`tracking3`, `depressionScreeningStatus`) or the complete set of current fields. This prevents type drift between the backend emission and frontend consumption.

  **Test list**:
  1. `toGridRowPayload does NOT include tracking3 or depressionScreeningStatus` -- Call `toGridRowPayload()` with a full PatientMeasure record. Assert the result does NOT have keys `tracking3` or `depressionScreeningStatus` (use `expect(result).not.toHaveProperty('tracking3')`).
  2. `toGridRowPayload includes all current GridRowPayload fields` -- Call `toGridRowPayload()`. Assert the result has ALL of: `id`, `patientId`, `memberName`, `memberDob`, `memberTelephone`, `memberAddress`, `insuranceGroup`, `requestType`, `qualityMeasure`, `measureStatus`, `statusDate`, `statusDatePrompt`, `tracking1`, `tracking2`, `dueDate`, `timeIntervalDays`, `notes`, `rowOrder`, `isDuplicate`, `hgba1cGoal`, `hgba1cGoalReachedYear`, `hgba1cDeclined`, `updatedAt`.

- **Acceptance Criteria**:
  - [ ] 2 tests written and passing
  - [ ] No regressions in existing `versionCheck.test.ts` (12 tests)
- **Dependencies**: None
- **Estimated Effort**: S
- **Traceability**: TRC-R12-AC1, TRC-R12-T1, TRC-R12-T2

---

### Task T5-1: HIGH -- Playwright E2E multi-context collaboration scenarios

- **Priority**: P1-HIGH (mixed P0-P3)
- **Framework**: Playwright E2E
- **Target File**: `frontend/e2e/parallel-editing-advanced.spec.ts` (new file)
- **Tests to Write**: 5
- **Description**: Several critical E2E scenarios are completely untested: HTTP-only fallback when Socket.IO is blocked, admin room switching, live edit indicators across two browser contexts, reconnect with data staleness verification, and room isolation between physicians. These all require two browser contexts (admin + staff, or two users).

  **Test list**:
  1. `grid loads and editing works via HTTP when Socket.IO is blocked` -- Block all `/socket.io/**` requests using `page.route()` BEFORE navigating. Log in and verify the grid loads with data (row count > 0). Edit a cell and verify the save succeeds via HTTP (200 response). Verify the StatusBar shows "Disconnected" or "Offline mode" (NOT "Connected"). *(P3-LOW, TRC-R1-T2)*
  2. `admin switching physician dropdown updates presence in both rooms` -- Context A: admin logged in, viewing physician 1. Context B: staff logged in, assigned to physician 1. Verify Context B sees "1 other online". Context A switches to physician 2 in the dropdown. Verify Context B's presence drops to 0 (or indicator disappears). *(P2-MEDIUM, TRC-R2-T4)*
  3. `live edit indicator: User A starts editing, User B sees dashed border, User A stops, border disappears` -- Context A: start editing a cell (click into it). Context B: verify the corresponding cell has a visual edit indicator (dashed border or `cell-remote-editing` class). Context A: press Escape to stop editing. Context B: verify the indicator disappears. *(P1-HIGH, TRC-R5-T4)*
  4. `reconnect after Socket.IO block refreshes grid data` -- Context A: log in, verify "Connected". Context B: log in, edit a cell to change a value. Block Socket.IO on Context A using `page.route()`. Wait for Context A to show "Disconnected" or "Reconnecting". Unblock Socket.IO on Context A. Wait for Context A to show "Connected". Verify Context A's grid reflects the value changed by Context B (data refresh occurred). *(P0-CRITICAL, TRC-R8-T2 -- depends on T1-1 fix)*
  5. `two users viewing different physicians are in separate rooms` -- Context A: admin viewing physician 1. Context B: admin viewing physician 2 (or staff assigned to physician 2). Verify neither context shows the other in presence. Context A edits a cell -- verify Context B does NOT see the edit indicator or row update. *(P2-MEDIUM, TRC-R11-T4)*

  **Page Object Model**: Use `MainPage` from `frontend/e2e/pages/main-page.ts` for grid interactions. Use `context.newPage()` pattern from existing `parallel-editing-conflict.spec.ts` for two-user scenarios.

  **Context cleanup**: Use `try/finally` to close additional browser contexts.

- **Acceptance Criteria**:
  - [ ] 5 tests written and passing
  - [ ] No regressions in existing Playwright E2E tests (11 tests)
  - [ ] All contexts properly cleaned up on failure
- **Dependencies**: T1-1 (test 4 depends on the reconnect room re-join fix)
- **Estimated Effort**: L
- **Run command**: `cd frontend && npx playwright test e2e/parallel-editing-advanced.spec.ts`
- **Traceability**: TRC-R1-T2, TRC-R2-T4, TRC-R5-T4, TRC-R8-T2, TRC-R11-T4

---

### Task T5-2: MEDIUM -- Cypress cell flash animation trigger from remote event

- **Priority**: P2-MEDIUM
- **Framework**: Cypress E2E
- **Target File**: `frontend/cypress/e2e/parallel-editing-edit-indicators.cy.ts` (extend)
- **Tests to Write**: 1
- **Description**: Existing Cypress tests verify that the `cell-remote-updated` CSS class and `cellFlash` animation keyframe exist in the stylesheet, but do not verify the animation is triggered when a remote `row:updated` event is received. This test dispatches a mock Socket.IO event and verifies the class is applied and then removed.

  **Test list**:
  1. `cell flash animation is triggered on remote row:updated event` -- Intercept the Socket.IO connection to dispatch a `row:updated` event with a changed field value. Verify the target cell temporarily has the `cell-remote-updated` CSS class applied. Wait for the animation duration and verify the class is removed.

- **Acceptance Criteria**:
  - [ ] 1 test written and passing
  - [ ] No regressions in existing `parallel-editing-edit-indicators.cy.ts` (4 tests)
- **Dependencies**: None
- **Estimated Effort**: S
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/parallel-editing-edit-indicators.cy.ts --headed`
- **Traceability**: TRC-R4-AC6, TRC-R4-T8

---

## Task T-FINAL: Regression Verification

- **Priority**: CRITICAL (run last)
- **Framework**: All
- **Description**: After all tasks are complete, run the full 4-layer test suite to verify no regressions.
- **Steps**:
  1. `cd backend && npm test` -- All backend Jest tests pass (57 existing + 13 new = 70 expected)
  2. `cd frontend && npm run test:run` -- All frontend Vitest tests pass (97 existing realtime-relevant + 11 new = 108 expected)
  3. `cd frontend && npx playwright test` -- All Playwright E2E tests pass (11 existing + 5 new = 16 expected)
  4. `cd frontend && npx cypress run --headed` -- All Cypress E2E tests pass (11 existing + 1 new = 12 expected)
- **Acceptance Criteria**:
  - [ ] Backend Jest: 0 failures
  - [ ] Frontend Vitest: 0 failures
  - [ ] Playwright E2E: 0 failures
  - [ ] Cypress E2E: 0 failures
  - [ ] Total new tests: 29 tests + 1 code fix confirmed
- **Dependencies**: All T1-T5 tasks complete
- **Estimated Effort**: S (run only, no writing)

---

## Execution Order

| Phase | Tasks | Priority | Dependencies |
|-------|-------|----------|-------------|
| 1 (P0 Critical) | T1-1, T1-2 | P0-CRITICAL | None |
| 2 (P1 High) | T2-1, T3-1, T3-3, T5-1 (tests 3,5) | P1-HIGH | T1-1 (for T5-1 test 4) |
| 3 (P2 Medium) | T3-2, T4-1, T4-2, T5-1 (tests 1,2), T5-2 | P2-MEDIUM | None |
| 4 (P3 Low) | T2-2 | P3-LOW | None |
| 5 (Regression) | T-FINAL | CRITICAL | All above |

## Traceability Matrix

| Task | Requirement IDs | Gap IDs Closed |
|------|----------------|----------------|
| T1-1 | TRC-R8-AC3 | TRC-R8-T1 |
| T1-2 | TRC-R5-AC8, TRC-R3-AC4 | TRC-R5-T1, TRC-R5-T5 |
| T2-1 | TRC-R2-AC7, TRC-R2-AC8 | TRC-R2-T1, TRC-R2-T2, TRC-R2-T3 |
| T2-2 | TRC-R1-AC1 | TRC-R1-T1 |
| T3-1 | TRC-R4-AC5, TRC-R4-AC8, TRC-R4-AC9, TRC-R5-AC9 | TRC-R4-T5, TRC-R4-T6, TRC-R4-T7, TRC-R5-T3 |
| T3-2 | TRC-R6-AC7, TRC-R6-AC8 | TRC-R6-T1, TRC-R6-T2, TRC-R6-T3 |
| T3-3 | TRC-R3-AC8, TRC-R9-AC1, TRC-R11-AC2 | TRC-R3-T1, TRC-R9-T1, TRC-R11-T2 |
| T4-1 | TRC-R7-AC1, TRC-R7-AC2, TRC-R10-AC1, TRC-R10-AC3 | TRC-R7-T1, TRC-R10-T1, TRC-R10-T3 |
| T4-2 | TRC-R12-AC1 | TRC-R12-T1, TRC-R12-T2 |
| T5-1 | TRC-R1-AC8, TRC-R2-AC6, TRC-R5-AC6, TRC-R8-AC3, TRC-R11-AC6 | TRC-R1-T2, TRC-R2-T4, TRC-R5-T4, TRC-R8-T2, TRC-R11-T4 |
| T5-2 | TRC-R4-AC6 | TRC-R4-T8 |

## Proposed Tests Not Included (Deferred)

The following proposed tests from the requirements spec are intentionally deferred as lower-value or better suited for a future iteration:

| Test ID | Reason Deferred |
|---------|-----------------|
| TRC-R6-T4 (Playwright: strengthen conflict test) | Existing `parallel-editing-conflict.spec.ts` already covers the core flow; incremental improvement |
| TRC-R6-T5 (Backend: timezone format in expectedVersion) | ISO string comparison is standard; very low regression risk |
| TRC-R7-T2 (Backend: multi-physician import broadcast) | Multi-physician import is rare; single-room broadcast (TRC-R7-T1) covers the mechanism |
| TRC-R7-T3 (Vitest: import banner rendering) | `realtimeStore.test.ts` already tests `setImportInProgress` state; banner is a UI detail |
| TRC-R7-T4 (Playwright: import banner E2E) | Complex E2E requiring test import API; deferred to import-specific test plan |
| TRC-R8-T3 (Playwright: max retry exhaustion) | `socketService.test.ts` already verifies the `reconnect_failed` handler; E2E adds marginal value |
| TRC-R8-T4 (Playwright: multi-tab reconnection independence) | Very complex to orchestrate; covered indirectly by T5-1 test 4 |
| TRC-R9-T2 (Vitest: atomic multi-field cascade) | Partially covered by T3-3 test 2 (cascade edit cancellation includes multi-field update) |
| TRC-R9-T3 (Playwright: cascade E2E) | Cascade is already tested indirectly via requestType changes in existing Cypress cell-editing tests |
| TRC-R10-T2 (Backend: overwritten user identity in audit) | `data.routes.version.test.ts` already tests `conflictOverride: true`; identity detail is incremental |
| TRC-R11-T1 (Playwright: row deleted during edit) | Complex E2E; the 404 handling is better tested as a Vitest unit test first |
| TRC-R11-T3 (Playwright: same-user multi-tab conflict) | Very complex; same mechanism as cross-user conflict which is already E2E tested |
| TRC-R11-T5 (Backend: derived field conflict filter) | Low risk; `versionCheck.test.ts` already tests field-level conflict detection |
| TRC-R3-T2 (Backend: presence broadcast on join/leave) | Covered by T2-1 (room:join/leave handlers verify presence:update broadcast) |
| TRC-R3-T3 (Playwright: presence tooltip with displayName) | `StatusBar.test.tsx` already tests tooltip display; incremental E2E value |
