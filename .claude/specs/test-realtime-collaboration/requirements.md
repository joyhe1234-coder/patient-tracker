# Feature: Test Real-Time Collaboration -- Comprehensive Test Plan for Module 6

## Introduction

This specification consolidates every testable behavior from the existing `parallel-editing` feature into a structured test plan. The parallel-editing feature (Module 6) adds real-time collaborative editing to Patient Tracker via Socket.IO, with WebSocket-based presence awareness, live row synchronization, concurrent edit indicators, optimistic concurrency control, conflict resolution, import broadcast, and connection resilience. A partial test suite already exists (~40 backend Jest, ~70 frontend Vitest, 4 Playwright spec files, 3 Cypress spec files). This requirements document maps every testable behavior from the parallel-editing specification to acceptance criteria, performs a gap analysis against the current test inventory, and proposes new test cases to achieve comprehensive coverage across all eight functional areas.

**Important Note:** The `tracking3` field referenced in older design documentation has been removed from the codebase. The `GridRowPayload` type currently has `tracking1` and `tracking2` only. Neither `tracking3` nor `depressionScreeningStatus` appears in the active Socket types (`frontend/src/types/socket.ts`, `frontend/src/types/index.ts`). All test cases must reflect the actual current type definitions.

## Alignment with Product Vision

The product vision explicitly states Patient Tracker "replaces Excel-based workflows" and identifies the Excel limitation of not supporting "multi-user access." Real-time collaboration is the feature that fulfills this promise. Testing it comprehensively is critical because:

1. **Data integrity** -- concurrent editing without proper coverage risks silent data loss, the exact problem the system exists to solve.
2. **User trust** -- healthcare workers need confidence that what they see is current and that their edits will not be silently overwritten.
3. **Graceful degradation** -- the system must remain fully usable when WebSocket connectivity is unavailable.
4. **Audit compliance** -- medical offices require accountability; conflict-override auditing must be verifiable by tests.

A comprehensive test plan ensures the real-time collaboration layer is production-ready across all deployment targets (local Docker, Render.com).

---

## Codebase Analysis: Current Test Inventory

### Existing Tests by Layer

| Layer | File | Test Count | Coverage Area |
|-------|------|------------|---------------|
| **Backend Jest** | `socketManager.test.ts` | 14 | Room naming, presence add/remove/dedup/disconnect, active edit add/replace/remove/clear |
| **Backend Jest** | `versionCheck.test.ts` | 10 | Version match, conflict with overlap, auto-merge non-overlap, missing audit data, deleted row, email fallback, multiple overlapping fields, DB error, toGridRowPayload |
| **Backend Jest** | `socketAuth.test.ts` | 8 | No token, undefined token, invalid token, user not found, deactivated user, success, admin multi-role, unexpected error |
| **Backend Jest** | `data.routes.version.test.ts` | 6 | No expectedVersion (backward compat), matching version, 409 conflict, forceOverwrite bypass, audit conflictOverride, auto-merge |
| **Frontend Vitest** | `socketService.test.ts` | 17 | Server URL, connect with JWT, connecting status, all event listeners registered, reconnection events registered, no duplicate connections, event handler invocation (row:updated, connect, disconnect), connect_error auth and generic |
| **Frontend Vitest** | `realtimeStore.test.ts` | 10 | Initial state, setRoomUsers (update/replace/empty), addActiveEdit (single/multiple/dedup), removeActiveEdit (match/non-match/no-op), clearActiveEdits (populated/empty), setImportInProgress (set/clear/missing) |
| **Frontend Vitest** | `ConflictModal.test.tsx` | 13 | isOpen false, isOpen true, patient name, changedBy, field name, three-column headers, values display, null values, multiple fields, Keep Mine callback, Keep Theirs callback, Cancel callback, backdrop click, three buttons |
| **Frontend Vitest** | `StatusBar.test.tsx` | 13 | Row count (filtered/unfiltered/undefined/large/zero), filter summary (present/absent/combined), connection status (connected/reconnecting/disconnected/offline/connecting), presence (single/plural/empty/tooltip hover/tooltip leave) |
| **Frontend Vitest** | `useSocket.test.ts` | 16 | Connect on mount, no connect without token, disconnect on unmount, join room, no join without physician, leave/rejoin on physician change, disconnected status on null token, handlers passed, onConnectionChange wiring, clear edits on disconnect, onPresenceUpdate wiring, onEditingActive wiring, onEditingInactive wiring, onImportStarted wiring, onImportCompleted wiring, onRowUpdated/onRowDeleted wiring |
| **Playwright E2E** | `parallel-editing-connection.spec.ts` | 3 | Connected status after login, presence shows when 2nd user joins, presence clears when 2nd user leaves |
| **Playwright E2E** | `parallel-editing-conflict.spec.ts` | 3 | Two users same cell triggers conflict, Keep Mine resolves, Keep Theirs reverts |
| **Playwright E2E** | `parallel-editing-reconnection.spec.ts` | 2 | Reconnecting shown when socket blocked, Connected returns when unblocked |
| **Playwright E2E** | `parallel-editing-updates.spec.ts` | 3 | Cell edit appears on other user's grid, add row appears, delete row disappears |
| **Cypress E2E** | `parallel-editing-edit-indicators.cy.ts` | 4 | CSS class exists, cellFlash animation exists, dashed orange border applied, class removal on stop |
| **Cypress E2E** | `parallel-editing-grid-updates.cy.ts` | 3 | Cell value update on remote event, scroll position preserved, row selection maintained |
| **Cypress E2E** | `parallel-editing-row-operations.cy.ts` | 4 | Rows loaded, selection state, add row count, delete row count |

**Totals:** ~38 Backend Jest | ~69 Frontend Vitest | 11 Playwright E2E | 11 Cypress E2E = **~129 total tests**

### Reusable Components Identified

- **`MainPage` Page Object Model** (`frontend/e2e/pages/main-page.ts`): Already has `editCell()`, `waitForSave()`, `getCellValue()`, `getRowCount()`, `findRowByMemberName()`, `selectRow()`, `addTestRow()` helpers for Playwright.
- **Custom Cypress Commands**: `cy.login()`, `cy.waitForAgGrid()`, `cy.getAgGridCell()`, `cy.selectAgGridDropdown()` available for grid interaction tests.
- **Mock Socket Factory**: `socketService.test.ts` has a reusable `createMockHandlers()` factory. `useSocket.test.ts` has full store mock setup patterns.
- **Version Check Mock Pattern**: `data.routes.version.test.ts` has a complete supertest app factory with all ESM mocks configured.
- **Test Data Factories**: `createMockMeasure()` helper functions exist in both `versionCheck.test.ts` and `data.routes.version.test.ts`.

---

## Requirements

> **Scope:** This document defines testable requirements for the real-time collaboration system. Each requirement maps to a functional area of the parallel-editing spec. Acceptance criteria describe the test behavior that must be verified, not the feature behavior (which is already specified in `parallel-editing/requirements.md`).

---

### Requirement 1: WebSocket Connection Test Coverage

**ID:** TRC-R1

**User Story:** As a test engineer, I want comprehensive test coverage of the Socket.IO connection lifecycle, so that I can verify JWT authentication, connection status indicators, and graceful fallback behavior across all deployment scenarios.

#### Acceptance Criteria

1. **TRC-R1-AC1:** WHEN the backend Socket.IO server is initialized, THEN tests SHALL verify it attaches to the existing HTTP server, configures CORS origins for both development and production, and registers the socketAuthMiddleware.
2. **TRC-R1-AC2:** WHEN a Socket.IO client connects with a valid JWT, THEN tests SHALL verify the connection succeeds, `socket.data` is populated with `userId`, `email`, `displayName`, `roles`, and `currentRoom: null`.
3. **TRC-R1-AC3:** WHEN a Socket.IO client connects with an invalid JWT, expired JWT, or missing JWT, THEN tests SHALL verify the connection is rejected with an appropriate error and the `next()` callback receives an `Error`.
4. **TRC-R1-AC4:** WHEN a Socket.IO client connects as a deactivated user, THEN tests SHALL verify the connection is rejected even if the JWT itself is valid.
5. **TRC-R1-AC5:** WHEN the frontend `socketService.connect()` is called, THEN tests SHALL verify the `io()` factory is invoked with the JWT in `auth.token`, transports `['websocket', 'polling']`, `reconnection: true`, `reconnectionDelay: 1000`, `reconnectionDelayMax: 30000`, and `reconnectionAttempts: 10`.
6. **TRC-R1-AC6:** WHEN the connection status changes, THEN tests SHALL verify the StatusBar renders the correct dot color and label for each state: green "Connected", yellow "Reconnecting...", red "Disconnected", gray "Offline mode", and no indicator for the transient "connecting" state.
7. **TRC-R1-AC7:** WHEN a `connect_error` with message "Authentication failed" is received, THEN tests SHALL verify the status transitions to `offline`. WHEN a generic `connect_error` is received, THEN the status SHALL transition to `disconnected`.
8. **TRC-R1-AC8:** WHEN the frontend detects the Socket.IO server is unavailable at page load, THEN E2E tests SHALL verify the page loads normally, the grid displays data via HTTP, and all editing works via HTTP-only mode.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `socketManager.test.ts` (partial -- tests room/presence, not init) | GAP: Server initialization not tested |
| AC2 | `socketAuth.test.ts` (success case, admin multi-role) | COVERED |
| AC3 | `socketAuth.test.ts` (no token, invalid, not found) | COVERED |
| AC4 | `socketAuth.test.ts` (deactivated user) | COVERED |
| AC5 | `socketService.test.ts` (connect with JWT) | COVERED |
| AC6 | `StatusBar.test.tsx` (all 5 states) | COVERED |
| AC7 | `socketService.test.ts` (connect_error auth + generic) | COVERED |
| AC8 | Not tested | GAP: HTTP-only fallback E2E not tested |

#### Proposed New Tests

- **TRC-R1-T1** (Backend Jest): `socketManager.initializeSocketIO` -- verify Socket.IO server creation with CORS config, middleware registration, and singleton behavior (calling twice returns same instance).
- **TRC-R1-T2** (Playwright E2E): HTTP-only fallback -- block all `/socket.io/**` requests before page load, verify grid loads and editing works via HTTP.

---

### Requirement 2: Room Management Test Coverage

**ID:** TRC-R2

**User Story:** As a test engineer, I want comprehensive test coverage of Socket.IO room join/leave operations, so that I can verify data isolation per physician, correct room naming, and proper room transitions when the user switches physicians.

#### Acceptance Criteria

1. **TRC-R2-AC1:** WHEN `getRoomName(physicianId)` is called, THEN tests SHALL verify it returns `'physician:{id}'` for numeric IDs and `'physician:unassigned'` for the string `'unassigned'`.
2. **TRC-R2-AC2:** WHEN the `useSocket` hook mounts with a `selectedPhysicianId`, THEN tests SHALL verify `joinRoom(physicianId)` is called.
3. **TRC-R2-AC3:** WHEN `selectedPhysicianId` changes from one physician to another, THEN tests SHALL verify `leaveRoom(oldId)` is called first, then `joinRoom(newId)`.
4. **TRC-R2-AC4:** WHEN `selectedPhysicianId` is null, THEN tests SHALL verify `joinRoom()` is NOT called.
5. **TRC-R2-AC5:** WHEN `joinRoom()` is called but the socket is not connected, THEN tests SHALL verify no `room:join` event is emitted.
6. **TRC-R2-AC6:** WHEN an admin switches physician views in the header dropdown, THEN E2E tests SHALL verify presence indicators update in both the old and new rooms.
7. **TRC-R2-AC7:** WHEN the backend receives a `room:join` event, THEN tests SHALL verify the socket joins the correct Socket.IO room, presence is updated for that room, and a `presence:update` event is broadcast to the room.
8. **TRC-R2-AC8:** WHEN the backend receives a `room:join` event for a room the user is not authorized to access (e.g., STAFF without assignment to that physician), THEN tests SHALL verify the join is rejected.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `socketManager.test.ts` (3 tests) | COVERED |
| AC2 | `useSocket.test.ts` (join room with physicianId) | COVERED |
| AC3 | `useSocket.test.ts` (leave old, join new) | COVERED |
| AC4 | `useSocket.test.ts` (no join without physician) | COVERED |
| AC5 | `socketService.test.ts` (joinRoom not connected) | COVERED |
| AC6 | Not tested | GAP: Admin room switch E2E |
| AC7 | Not tested | GAP: Backend room:join handler with presence broadcast |
| AC8 | Not tested | GAP: Unauthorized room join rejection |

#### Proposed New Tests

- **TRC-R2-T1** (Backend Jest): `socketManager` -- test `room:join` handler: socket joins room, `addUserToRoom()` called, `presence:update` broadcast to room.
- **TRC-R2-T2** (Backend Jest): `socketManager` -- test `room:join` authorization: STAFF user tries to join a physician room they are not assigned to, join is rejected.
- **TRC-R2-T3** (Backend Jest): `socketManager` -- test `room:leave` handler: socket leaves room, `removeUserFromRoom()` called, `presence:update` broadcast, active edits cleared for that socket in that room.
- **TRC-R2-T4** (Playwright E2E): Admin room switch -- admin switches physician in dropdown, verify presence updates (use two browser contexts, one admin, one staff).

---

### Requirement 3: Presence Tracking Test Coverage

**ID:** TRC-R3

**User Story:** As a test engineer, I want comprehensive test coverage of the presence tracking system, so that I can verify user counts, display names, tooltip behavior, and presence updates on join/leave/disconnect events.

#### Acceptance Criteria

1. **TRC-R3-AC1:** WHEN a user joins a room, THEN tests SHALL verify `addUserToRoom()` adds the user with correct `id` and `displayName`, and `getPresenceForRoom()` returns the updated list.
2. **TRC-R3-AC2:** WHEN a user with multiple socket connections (multiple tabs) joins the same room, THEN tests SHALL verify the user appears only once in the presence list (deduplication by userId).
3. **TRC-R3-AC3:** WHEN a user leaves a room, THEN tests SHALL verify the user is removed from presence and other users receive a `presence:update` event within 2 seconds.
4. **TRC-R3-AC4:** WHEN a user disconnects unexpectedly (browser close, network loss), THEN tests SHALL verify `removeUserFromAllRooms()` is called and all rooms that contained the user receive updated presence.
5. **TRC-R3-AC5:** WHEN one other user is in the room, THEN tests SHALL verify the StatusBar shows "1 other online". WHEN two are present, THEN it SHALL show "2 others online".
6. **TRC-R3-AC6:** WHEN no other users are in the room, THEN tests SHALL verify no presence indicator is displayed.
7. **TRC-R3-AC7:** WHEN the user hovers over the presence indicator, THEN tests SHALL verify a tooltip appears listing the `displayName` of each other user. WHEN the user unhovers, THEN the tooltip SHALL disappear.
8. **TRC-R3-AC8:** WHEN the `onPresenceUpdate` handler receives a users list, THEN tests SHALL verify it filters out the current user before calling `setRoomUsers()`.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `socketManager.test.ts` (add user to room) | COVERED |
| AC2 | `socketManager.test.ts` (deduplicate multiple sockets) | COVERED |
| AC3 | `socketManager.test.ts` (remove user) | COVERED (unit), GAP: broadcast verification |
| AC4 | `socketManager.test.ts` (removeUserFromAllRooms) | COVERED |
| AC5 | `StatusBar.test.tsx` (single/plural) | COVERED |
| AC6 | `StatusBar.test.tsx` (empty roomUsers) | COVERED |
| AC7 | `StatusBar.test.tsx` (hover/unhover tooltip) | COVERED |
| AC8 | `useSocket.test.ts` (onPresenceUpdate wiring) | PARTIAL: Wiring tested but self-filter logic not verified |

#### Proposed New Tests

- **TRC-R3-T1** (Frontend Vitest): `useSocket` -- verify `onPresenceUpdate` filters out the current user (user.id === 99) before calling `setRoomUsers()`.
- **TRC-R3-T2** (Backend Jest): `socketManager` -- verify `presence:update` broadcast is emitted to the room when user joins/leaves.
- **TRC-R3-T3** (Playwright E2E): Two users viewing same physician -- verify presence count shows "1 other" for each, then one leaves and the count disappears. (Already exists, but add assertion that displayName appears in tooltip.)

---

### Requirement 4: Real-Time Row Synchronization Test Coverage

**ID:** TRC-R4

**User Story:** As a test engineer, I want comprehensive test coverage of row-level event broadcasting and grid update handling, so that I can verify that `row:updated`, `row:created`, and `row:deleted` events propagate correctly and the AG Grid updates without disrupting scroll position or selections.

#### Acceptance Criteria

1. **TRC-R4-AC1:** WHEN a PUT /api/data/:id succeeds, THEN tests SHALL verify the backend emits `row:updated` to the physician room with the full updated row data and the `changedBy` display name, excluding the originating socket.
2. **TRC-R4-AC2:** WHEN a POST /api/data succeeds, THEN tests SHALL verify the backend emits `row:created` to the physician room with the new row data and `changedBy`.
3. **TRC-R4-AC3:** WHEN a DELETE /api/data/:id succeeds, THEN tests SHALL verify the backend emits `row:deleted` to the physician room with the deleted row's ID and `changedBy`.
4. **TRC-R4-AC4:** WHEN a POST /api/data/duplicate succeeds, THEN tests SHALL verify the backend emits `row:created` to the physician room with the duplicated row data.
5. **TRC-R4-AC5:** WHEN a `row:updated` event is received by the frontend, THEN tests SHALL verify the AG Grid row data is updated in place using `node.setData()` without causing a full grid redraw, scroll position change, or selection change.
6. **TRC-R4-AC6:** WHEN a `row:updated` event is received for a cell the current user is NOT editing, THEN tests SHALL verify a brief cell flash animation is triggered (CSS class `cell-remote-updated` with `cellFlash` keyframe).
7. **TRC-R4-AC7:** WHEN a `row:created` event is received, THEN tests SHALL verify a new row appears in the grid at the correct position (respecting `rowOrder`).
8. **TRC-R4-AC8:** WHEN a `row:deleted` event is received for a selected row, THEN tests SHALL verify the row is removed and the selection is cleared.
9. **TRC-R4-AC9:** WHEN a `row:updated` event has an `updatedAt` older than the locally stored `updatedAt` for that row (out-of-order broadcast), THEN tests SHALL verify the event is discarded and the row data is NOT updated.
10. **TRC-R4-AC10:** WHEN the `row:updated` event changes the `isDuplicate` flag, THEN tests SHALL verify the frontend refreshes duplicate flags for sibling rows.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | Not tested (route-level broadcast emission) | GAP: broadcastToRoom called after PUT |
| AC2 | Not tested (route-level broadcast emission) | GAP: broadcastToRoom called after POST |
| AC3 | Not tested (route-level broadcast emission) | GAP: broadcastToRoom called after DELETE |
| AC4 | Not tested (route-level broadcast emission) | GAP: broadcastToRoom called after duplicate |
| AC5 | `parallel-editing-grid-updates.cy.ts` (scroll position, selection maintained) | PARTIAL: Tests scroll/selection but not in-place update verification |
| AC6 | `parallel-editing-edit-indicators.cy.ts` (CSS class/animation exists) | PARTIAL: CSS existence tested, not animation trigger |
| AC7 | `parallel-editing-updates.spec.ts` (Playwright: add row appears) | COVERED |
| AC8 | `parallel-editing-updates.spec.ts` (Playwright: delete row disappears) | PARTIAL: Removal tested, selection clear not verified |
| AC9 | Not tested | GAP: Out-of-order broadcast rejection |
| AC10 | Not tested | GAP: isDuplicate flag refresh on remote update |

#### Proposed New Tests

- **TRC-R4-T1** (Backend Jest): Data routes -- verify `broadcastToRoom()` is called with `row:updated` event and correct room after successful PUT /api/data/:id.
- **TRC-R4-T2** (Backend Jest): Data routes -- verify `broadcastToRoom()` is called with `row:created` event after successful POST /api/data.
- **TRC-R4-T3** (Backend Jest): Data routes -- verify `broadcastToRoom()` is called with `row:deleted` event after successful DELETE /api/data/:id.
- **TRC-R4-T4** (Backend Jest): Data routes -- verify `broadcastToRoom()` is called with `row:created` event after successful POST /api/data/duplicate.
- **TRC-R4-T5** (Frontend Vitest): `PatientGrid` `handleRemoteRowUpdate` -- verify `node.setData()` is called (mock AG Grid API), scroll position not changed.
- **TRC-R4-T6** (Frontend Vitest): `PatientGrid` `handleRemoteRowUpdate` -- verify out-of-order broadcast (older `updatedAt`) is discarded.
- **TRC-R4-T7** (Frontend Vitest): `PatientGrid` `handleRemoteRowDelete` -- verify row node removed and selection cleared if that row was selected.
- **TRC-R4-T8** (Cypress E2E): Simulate `row:updated` via dispatching mock Socket.IO event, verify cell flash animation class is applied and then removed.

---

### Requirement 5: Concurrent Edit Detection Test Coverage

**ID:** TRC-R5

**User Story:** As a test engineer, I want comprehensive test coverage of the active edit indicator system, so that I can verify that `editing:start`/`editing:stop` events are emitted and received correctly, dashed orange borders appear on cells being edited by others, and edit indicators clear on disconnect.

#### Acceptance Criteria

1. **TRC-R5-AC1:** WHEN a user enters edit mode on a cell, THEN tests SHALL verify `emitEditingStart(rowId, field)` is called with the correct parameters.
2. **TRC-R5-AC2:** WHEN a user exits edit mode on a cell, THEN tests SHALL verify `emitEditingStop(rowId, field)` is called.
3. **TRC-R5-AC3:** WHEN `emitEditingStart` is called but the socket is not connected, THEN tests SHALL verify no event is emitted.
4. **TRC-R5-AC4:** WHEN an `editing:active` event is received from the server, THEN tests SHALL verify `addActiveEdit({ rowId, field, userName })` is called on the realtime store.
5. **TRC-R5-AC5:** WHEN an `editing:inactive` event is received from the server, THEN tests SHALL verify `removeActiveEdit(rowId, field)` is called on the realtime store.
6. **TRC-R5-AC6:** WHEN the realtime store contains an active edit for a cell, THEN tests SHALL verify the AG Grid cell has the `cell-remote-editing` CSS class applied with a dashed orange border style.
7. **TRC-R5-AC7:** WHEN the active edit is removed from the store, THEN tests SHALL verify the `cell-remote-editing` class is removed from the cell.
8. **TRC-R5-AC8:** WHEN a remote user disconnects unexpectedly, THEN tests SHALL verify all their active edit indicators are cleared (via `clearEditsForSocket()` on the backend and propagated to clients).
9. **TRC-R5-AC9:** WHEN multiple remote users are editing different cells in the same row, THEN tests SHALL verify each cell independently shows its own edit indicator.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `socketService.test.ts` (emitEditingStart) | COVERED |
| AC2 | `socketService.test.ts` (emitEditingStop) | COVERED |
| AC3 | `socketService.test.ts` (not connected) | COVERED |
| AC4 | `useSocket.test.ts` (onEditingActive wiring) | COVERED |
| AC5 | `useSocket.test.ts` (onEditingInactive wiring) | COVERED |
| AC6 | `parallel-editing-edit-indicators.cy.ts` (dashed orange border applied) | COVERED |
| AC7 | `parallel-editing-edit-indicators.cy.ts` (class removal) | COVERED |
| AC8 | `socketManager.test.ts` (clearEditsForSocket) | PARTIAL: Unit tested, E2E not tested |
| AC9 | Not tested | GAP: Multiple concurrent edit indicators per row |

#### Proposed New Tests

- **TRC-R5-T1** (Backend Jest): `socketManager` -- verify disconnect handler calls `clearEditsForSocket()` and broadcasts `editing:inactive` for each cleared edit to the affected rooms.
- **TRC-R5-T2** (Frontend Vitest): `PatientGrid` -- verify `cellClass` callback returns `cell-remote-editing` when `realtimeStore.activeEdits` contains a matching `(rowId, field)` entry.
- **TRC-R5-T3** (Frontend Vitest): `PatientGrid` -- verify multiple active edits on the same row result in independent CSS classes per cell.
- **TRC-R5-T4** (Playwright E2E): Two browser contexts -- User A starts editing a cell, User B sees the dashed orange border on that cell. User A stops editing, User B sees the border disappear.
- **TRC-R5-T5** (Backend Jest): `socketManager` -- verify stale edit lock cleanup: if `editing:start` is received but no corresponding `editing:stop` arrives within a timeout, the edit is eventually cleared.

---

### Requirement 6: Conflict Resolution Test Coverage

**ID:** TRC-R6

**User Story:** As a test engineer, I want comprehensive test coverage of the optimistic concurrency control and conflict resolution dialog, so that I can verify version checking, 409 responses, field-level auto-merge, the ConflictModal UI, and force-overwrite auditing.

#### Acceptance Criteria

1. **TRC-R6-AC1:** WHEN a PUT /api/data/:id includes `expectedVersion` that matches the database `updatedAt`, THEN tests SHALL verify the update proceeds normally (200 OK) and `checkVersion()` returns `hasConflict: false`.
2. **TRC-R6-AC2:** WHEN a PUT /api/data/:id includes `expectedVersion` that does NOT match and the changed fields overlap with the fields changed since that version, THEN tests SHALL verify a 409 response with code `VERSION_CONFLICT`, the `serverRow`, `conflictFields`, and `changedBy`.
3. **TRC-R6-AC3:** WHEN a PUT /api/data/:id includes `expectedVersion` that does NOT match but the changed fields do NOT overlap, THEN tests SHALL verify the update auto-merges (200 OK) without triggering the conflict dialog.
4. **TRC-R6-AC4:** WHEN a PUT /api/data/:id includes `forceOverwrite: true`, THEN tests SHALL verify the update succeeds (200 OK) regardless of version mismatch, `checkVersion()` is NOT called, and the audit log entry includes `conflictOverride: true`.
5. **TRC-R6-AC5:** WHEN a PUT /api/data/:id has NO `expectedVersion` field, THEN tests SHALL verify backward compatibility: the update proceeds without any version check.
6. **TRC-R6-AC6:** WHEN the ConflictModal renders, THEN tests SHALL verify it displays "Edit Conflict" title, the patient name, the `changedBy` user name, Original/Their Version/Your Version columns, and all three buttons (Keep Mine, Keep Theirs, Cancel).
7. **TRC-R6-AC7:** WHEN "Keep Mine" is clicked, THEN tests SHALL verify the `onKeepMine` callback fires, which sends a `forceOverwrite: true` PUT request.
8. **TRC-R6-AC8:** WHEN "Keep Theirs" or "Cancel" is clicked, THEN tests SHALL verify the cell reverts to the server value and no additional API call is made.
9. **TRC-R6-AC9:** WHEN multiple fields conflict on the same row simultaneously, THEN tests SHALL verify the ConflictModal shows all conflicting fields together.
10. **TRC-R6-AC10:** WHEN null values are involved in a conflict (e.g., field was empty before), THEN tests SHALL verify the ConflictModal displays "(empty)" for null values.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `versionCheck.test.ts` + `data.routes.version.test.ts` | COVERED |
| AC2 | `versionCheck.test.ts` + `data.routes.version.test.ts` | COVERED |
| AC3 | `versionCheck.test.ts` + `data.routes.version.test.ts` | COVERED |
| AC4 | `data.routes.version.test.ts` (forceOverwrite + audit) | COVERED |
| AC5 | `data.routes.version.test.ts` (backward compat) | COVERED |
| AC6 | `ConflictModal.test.tsx` (title, name, columns, buttons) | COVERED |
| AC7 | `ConflictModal.test.tsx` (Keep Mine callback) | PARTIAL: Callback fires, but forceOverwrite PUT not verified |
| AC8 | `ConflictModal.test.tsx` (Keep Theirs, Cancel callbacks) | PARTIAL: Callbacks fire, cell revert not verified |
| AC9 | `ConflictModal.test.tsx` (multiple fields) | COVERED |
| AC10 | `ConflictModal.test.tsx` (null values) | COVERED |

#### Proposed New Tests

- **TRC-R6-T1** (Frontend Vitest): `PatientGrid` or integration -- verify that when a 409 response is received from PUT, the ConflictModal opens with the correct conflict data extracted from the response body.
- **TRC-R6-T2** (Frontend Vitest): `PatientGrid` or integration -- verify that clicking "Keep Mine" in the modal triggers a second PUT request with `forceOverwrite: true`.
- **TRC-R6-T3** (Frontend Vitest): `PatientGrid` or integration -- verify that clicking "Keep Theirs" reverts the cell value to `serverRow[field]` from the 409 response and no second PUT is made.
- **TRC-R6-T4** (Playwright E2E): Strengthen existing conflict test -- assert that after "Keep Mine" is clicked, the cell value equals User B's value on BOTH users' grids.
- **TRC-R6-T5** (Backend Jest): `versionCheck` -- test with `expectedVersion` in a different timezone format (ensure ISO string comparison works).

---

### Requirement 7: Import Broadcast Test Coverage

**ID:** TRC-R7

**User Story:** As a test engineer, I want comprehensive test coverage of import event broadcasting, so that I can verify that `import:started` shows a banner, `import:completed` triggers a full data refresh, and editing continues uninterrupted during import.

#### Acceptance Criteria

1. **TRC-R7-AC1:** WHEN import execution begins (POST /api/import/execute), THEN tests SHALL verify the backend emits `import:started` with `importedBy` display name to the affected physician room(s).
2. **TRC-R7-AC2:** WHEN import execution completes, THEN tests SHALL verify the backend emits `import:completed` with `importedBy` and `stats` to the affected physician room(s).
3. **TRC-R7-AC3:** WHEN `import:started` is received by the frontend, THEN tests SHALL verify `setImportInProgress(true, importedBy)` is called and the import banner is rendered.
4. **TRC-R7-AC4:** WHEN `import:completed` is received, THEN tests SHALL verify `setImportInProgress(false)` is called, `onDataRefresh()` is called, and the import banner is dismissed.
5. **TRC-R7-AC5:** WHEN an import is in progress and a user attempts to edit a cell, THEN tests SHALL verify the edit is allowed (not blocked).
6. **TRC-R7-AC6:** WHEN an import affects multiple physicians (multi-physician import), THEN tests SHALL verify `import:started` and `import:completed` are emitted to all affected rooms.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | Not tested at route level | GAP: Import route broadcast emission |
| AC2 | Not tested at route level | GAP: Import route broadcast emission |
| AC3 | `useSocket.test.ts` (onImportStarted wiring), `realtimeStore.test.ts` (setImportInProgress) | COVERED (store + hook) |
| AC4 | `useSocket.test.ts` (onImportCompleted wiring + onDataRefresh), `realtimeStore.test.ts` (clear) | COVERED (store + hook) |
| AC5 | Not tested | GAP: Edit during import banner |
| AC6 | Not tested | GAP: Multi-physician import broadcast |

#### Proposed New Tests

- **TRC-R7-T1** (Backend Jest): Import routes -- verify `broadcastToRoom()` is called with `import:started` before import execution begins and `import:completed` after it completes.
- **TRC-R7-T2** (Backend Jest): Import routes -- verify multi-physician import emits to all affected rooms.
- **TRC-R7-T3** (Frontend Vitest): Import banner component -- verify banner renders when `importInProgress` is true and is hidden when false.
- **TRC-R7-T4** (Playwright E2E): Start an import while another user is viewing the grid, verify the banner appears and disappears after import completes. (Complex E2E, may need mock server or test API route.)

---

### Requirement 8: Connection Resilience Test Coverage

**ID:** TRC-R8

**User Story:** As a test engineer, I want comprehensive test coverage of reconnection behavior, exponential backoff, room re-joining after reconnect, and data refresh after reconnect, so that I can verify the system recovers gracefully from network interruptions without data inconsistency.

#### Acceptance Criteria

1. **TRC-R8-AC1:** WHEN Socket.IO connection drops, THEN tests SHALL verify the frontend automatically attempts reconnection using exponential backoff (1s initial, 2x multiplier, 30s max, 10 max attempts).
2. **TRC-R8-AC2:** WHEN reconnection is in progress, THEN tests SHALL verify the `reconnect_attempt` event triggers the "reconnecting" connection status, and the StatusBar shows yellow "Reconnecting...".
3. **TRC-R8-AC3:** WHEN reconnection succeeds, THEN tests SHALL verify the client re-joins the appropriate physician room and performs a full data refresh (GET /api/data).
4. **TRC-R8-AC4:** WHEN reconnection fails after all 10 retry attempts, THEN tests SHALL verify the `reconnect_failed` event triggers the "offline" connection status, and the system continues in HTTP-only mode.
5. **TRC-R8-AC5:** WHEN the backend restarts (all clients disconnect), THEN tests SHALL verify all clients detect disconnection and follow the reconnection flow.
6. **TRC-R8-AC6:** WHEN the user is disconnected and reconnects, THEN tests SHALL verify all stale active edit indicators are cleared before new presence data is applied.
7. **TRC-R8-AC7:** WHEN the user has two browser tabs open and one loses connection while the other stays connected, THEN tests SHALL verify the reconnecting tab recovers independently without affecting the connected tab.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `socketService.test.ts` (reconnection config verified) | COVERED (config) |
| AC2 | `socketService.test.ts` (reconnect_attempt handler), `StatusBar.test.tsx` (yellow) | COVERED |
| AC3 | Not tested | GAP: Room re-join + data refresh after reconnect |
| AC4 | `socketService.test.ts` (reconnect_failed handler), `StatusBar.test.tsx` (offline) | PARTIAL: Status change tested, HTTP-only continuation not verified |
| AC5 | `parallel-editing-reconnection.spec.ts` (block/unblock socket.io) | PARTIAL: Tests status change but not full reconnect flow |
| AC6 | `useSocket.test.ts` (clearActiveEdits on disconnect) | COVERED (unit) |
| AC7 | Not tested | GAP: Multi-tab reconnection independence |

#### Proposed New Tests

- **TRC-R8-T1** (Frontend Vitest): `useSocket` -- verify that when `onConnectionChange('connected')` fires after a previous `'disconnected'`, the hook calls `joinRoom(selectedPhysicianId)` again (room re-join) and calls `onDataRefresh()` (full data refresh).
- **TRC-R8-T2** (Playwright E2E): Block Socket.IO, wait for "Disconnected", unblock, verify status returns to "Connected" AND the grid data is refreshed (verify row data is current by comparing with a value changed during disconnection by another context).
- **TRC-R8-T3** (Playwright E2E): Block Socket.IO until all retries exhaust, verify status shows "Disconnected" then "Offline mode", verify editing still works via HTTP.
- **TRC-R8-T4** (Playwright E2E): Multi-tab scenario -- open two tabs for the same user, block Socket.IO on tab 1 only, verify tab 2 remains connected and receives updates normally while tab 1 shows "Reconnecting".

---

### Requirement 9: Cascading Edit Conflict Handling Test Coverage

**ID:** TRC-R9

**User Story:** As a test engineer, I want test coverage of cascading edit scenarios where a parent field change clears downstream fields while another user is editing a downstream field, so that I can verify the affected user's edit is cancelled with a notification.

#### Acceptance Criteria

1. **TRC-R9-AC1:** WHEN User A changes `requestType` (which cascades to clear `qualityMeasure`, `measureStatus`, `statusDate`, `tracking1`, `tracking2`, `dueDate`, `timeIntervalDays`), AND User B is editing `measureStatus`, THEN tests SHALL verify User B's edit mode is cancelled, the row data updates to reflect the cascade, and a toast notification appears.
2. **TRC-R9-AC2:** WHEN a `row:updated` broadcast includes multiple fields cleared (cascade), THEN tests SHALL verify all affected fields are updated atomically in one AG Grid operation.
3. **TRC-R9-AC3:** WHEN the cascade broadcast arrives for a row the current user is NOT editing, THEN tests SHALL verify the row updates silently with a cell flash (no toast, no edit cancellation).

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | Not tested | GAP: Cascade edit cancellation with notification |
| AC2 | Not tested | GAP: Atomic multi-field update |
| AC3 | Partially by general row:updated tests | GAP: No explicit cascade-specific test |

#### Proposed New Tests

- **TRC-R9-T1** (Frontend Vitest): `PatientGrid` `handleRemoteRowUpdate` -- when the row being updated matches the row the user is actively editing, verify edit mode is exited and a toast/notification is triggered.
- **TRC-R9-T2** (Frontend Vitest): `PatientGrid` `handleRemoteRowUpdate` -- verify that a cascade update (multiple fields changed to null) updates all fields in one `setData()` call.
- **TRC-R9-T3** (Playwright E2E): User A changes `requestType`, User B is editing `measureStatus` on the same row -- verify User B's cell exits edit mode and the cascade values appear.

---

### Requirement 10: Audit Trail for Concurrent Edits Test Coverage

**ID:** TRC-R10

**User Story:** As a test engineer, I want test coverage of audit logging for conflict scenarios, so that I can verify that normal saves, force-overwrite saves, and "Keep Theirs" resolutions produce correct audit entries.

#### Acceptance Criteria

1. **TRC-R10-AC1:** WHEN a cell edit is saved normally (no conflict), THEN tests SHALL verify the audit log entry includes userId, userEmail, entity (`patient_measure`), entityId, and field-level changes (old/new values).
2. **TRC-R10-AC2:** WHEN a force-overwrite save occurs (user chose "Keep Mine"), THEN tests SHALL verify the audit log entry includes `conflictOverride: true` and the overwritten user's identity.
3. **TRC-R10-AC3:** WHEN a "Keep Theirs" resolution occurs, THEN tests SHALL verify no additional audit log entry is created.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `data.routes.version.test.ts` (audit log creation on PUT) | PARTIAL: Verifies audit call exists but not field-level detail for normal save |
| AC2 | `data.routes.version.test.ts` (conflictOverride in audit) | COVERED |
| AC3 | Not tested | GAP: No audit log on Keep Theirs |

#### Proposed New Tests

- **TRC-R10-T1** (Backend Jest): Data routes -- verify normal save audit log entry includes correct `changes.fields` array with old and new values.
- **TRC-R10-T2** (Backend Jest): Data routes -- verify force-overwrite audit log includes `overwrittenUserId` and `overwrittenUserEmail` in `changes`.
- **TRC-R10-T3** (Frontend Vitest): Integration -- verify that "Keep Theirs" resolution sends no API call (mock Axios and assert no PUT after Keep Theirs callback).

---

### Requirement 11: Edge Case Test Coverage

**ID:** TRC-R11

**User Story:** As a test engineer, I want test coverage of critical edge cases documented in the parallel-editing specification, so that I can verify the system handles boundary conditions gracefully.

#### Acceptance Criteria

1. **TRC-R11-AC1:** WHEN User B is editing a cell and User A deletes the entire row, THEN tests SHALL verify User B's edit is cancelled, the row is removed from the grid, and a toast notification is shown. IF User B attempts to save, THEN the PUT returns 404 and the frontend handles it gracefully.
2. **TRC-R11-AC2:** WHEN a user rapidly edits 5 cells in succession (tab-through editing), THEN tests SHALL verify each PUT includes the correct `expectedVersion` for that row and no self-conflicts occur.
3. **TRC-R11-AC3:** WHEN a user opens the same grid in two browser tabs, THEN tests SHALL verify edits in Tab A are broadcast to Tab B and conflicts between the user's own tabs are handled the same as between different users.
4. **TRC-R11-AC4:** WHEN a user saves while disconnected from Socket.IO (HTTP still works), THEN tests SHALL verify the PUT succeeds via HTTP and other users receive the update when the user reconnects.
5. **TRC-R11-AC5:** WHEN a conflict occurs on an auto-calculated field (e.g., `dueDate` from `statusDate` change), THEN tests SHALL verify only the explicitly edited field (`statusDate`) appears in the conflict dialog, not the derived fields.
6. **TRC-R11-AC6:** WHEN two users view different physicians, THEN tests SHALL verify they are in separate rooms and do not see each other's presence, edits, or updates.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | Not tested | GAP |
| AC2 | Not tested | GAP |
| AC3 | Not tested (described in spec EC-12) | GAP |
| AC4 | Not tested (described in spec EC-2) | GAP |
| AC5 | Not tested (described in spec EC-9) | GAP |
| AC6 | Not tested (described in spec EC-7) | GAP |

#### Proposed New Tests

- **TRC-R11-T1** (Playwright E2E): Row deleted while User B is editing -- User A deletes the row, verify User B sees it disappear and a 404 PUT is handled gracefully (no unhandled error).
- **TRC-R11-T2** (Frontend Vitest): `PatientGrid` -- simulate rapid sequential edits (5 cells), verify each PUT call includes the `updatedAt` from the most recently received API response.
- **TRC-R11-T3** (Playwright E2E): Two tabs for same user -- edit in Tab A, verify value appears in Tab B via Socket.IO. Edit same cell in both tabs, verify conflict dialog.
- **TRC-R11-T4** (Playwright E2E): Two users viewing different physicians -- verify they are in separate rooms by checking presence (each shows 0 others).
- **TRC-R11-T5** (Backend Jest): `versionCheck` -- verify that when `conflictFields` overlap only on a derived field (e.g., `dueDate`), the conflict is NOT flagged (only explicitly edited fields are compared).

---

### Requirement 12: Type Safety and Data Contract Test Coverage

**ID:** TRC-R12

**User Story:** As a test engineer, I want test coverage ensuring the Socket.IO event payload types match the actual database schema, so that type drift between backend emissions and frontend handlers is caught by tests.

#### Acceptance Criteria

1. **TRC-R12-AC1:** WHEN `toGridRowPayload()` converts a PatientMeasure record to a GridRowPayload, THEN tests SHALL verify all fields in the GridRowPayload interface are present with correct types, including `insuranceGroup` and excluding the removed `tracking3` and `depressionScreeningStatus` fields.
2. **TRC-R12-AC2:** WHEN a `row:updated` event payload is emitted, THEN tests SHALL verify the payload structure matches the `GridRowPayload` interface defined in `frontend/src/types/socket.ts`.
3. **TRC-R12-AC3:** WHEN the frontend receives a `row:updated` payload, THEN tests SHALL verify the `updatedAt` field is present and is a valid ISO timestamp string.

#### Current Coverage

| AC | Covered By | Status |
|----|-----------|--------|
| AC1 | `versionCheck.test.ts` (toGridRowPayload) | PARTIAL: Tests basic fields + insuranceGroup, but does not assert absence of tracking3 |
| AC2 | Not tested | GAP: Payload structure conformance |
| AC3 | `versionCheck.test.ts` (typeof updatedAt is string) | COVERED |

#### Proposed New Tests

- **TRC-R12-T1** (Backend Jest): `toGridRowPayload` -- assert the payload does NOT contain `tracking3` or `depressionScreeningStatus` keys.
- **TRC-R12-T2** (Backend Jest): `toGridRowPayload` -- assert the payload DOES contain all current fields: `id`, `patientId`, `memberName`, `memberDob`, `memberTelephone`, `memberAddress`, `insuranceGroup`, `requestType`, `qualityMeasure`, `measureStatus`, `statusDate`, `statusDatePrompt`, `tracking1`, `tracking2`, `dueDate`, `timeIntervalDays`, `notes`, `rowOrder`, `isDuplicate`, `hgba1cGoal`, `hgba1cGoalReachedYear`, `hgba1cDeclined`, `updatedAt`.

---

## Non-Functional Requirements

### Performance

- **TRC-NFR-P1:** All new unit tests SHALL execute in under 5 seconds per test file. The complete backend Jest suite SHALL complete in under 60 seconds.
- **TRC-NFR-P2:** All new Vitest tests SHALL execute in under 3 seconds per test file. The complete frontend Vitest suite SHALL complete in under 30 seconds.
- **TRC-NFR-P3:** Playwright E2E tests using two browser contexts SHALL complete each test in under 30 seconds. The total parallel-editing E2E suite SHALL complete in under 3 minutes.
- **TRC-NFR-P4:** Cypress E2E tests SHALL complete each test in under 20 seconds.

### Security

- **TRC-NFR-S1:** Tests SHALL NOT hard-code real production credentials. Test fixtures SHALL use test-specific accounts (`ko037291@gmail.com`, `staff1@clinic.com` with known test passwords).
- **TRC-NFR-S2:** Tests SHALL verify that Socket.IO connections without valid JWT tokens are rejected (already covered by `socketAuth.test.ts`).
- **TRC-NFR-S3:** Tests SHALL verify that room access authorization is enforced (STAFF can only join rooms for assigned physicians).

### Reliability

- **TRC-NFR-R1:** All tests SHALL be deterministic and repeatable. Tests SHALL NOT depend on execution order or shared mutable state between test files.
- **TRC-NFR-R2:** E2E tests SHALL use explicit waits (Playwright: `expect().toContainText({ timeout })`, Cypress: `should()` with auto-retry) rather than fixed timeouts or `sleep()`.
- **TRC-NFR-R3:** Browser context cleanup in Playwright E2E tests SHALL use `finally` blocks to ensure contexts are closed even on test failure.

### Usability

- **TRC-NFR-U1:** Test descriptions SHALL clearly describe the scenario and expected behavior using the `describe`/`it` naming convention: `describe('component')` > `describe('method/scenario')` > `it('should [behavior]')`.
- **TRC-NFR-U2:** Test files SHALL include JSDoc headers describing their purpose and scope.
- **TRC-NFR-U3:** Test helper functions (mock factories, login helpers) SHALL be reusable and documented.

---

## Gap Analysis Summary

### Coverage by Area

| Area | Existing Tests | Coverage Level | Key Gaps |
|------|---------------|----------------|----------|
| WebSocket Connection | 33 (auth + service + status + E2E) | **High** | Server initialization test, HTTP-only fallback E2E |
| Room Management | 11 (naming + hook + service) | **Medium** | Backend join/leave handlers, authorization check, admin room switch E2E |
| Presence Tracking | 14 (manager + status bar + hook) | **High** | Self-filter in onPresenceUpdate, broadcast verification |
| Real-Time Row Sync | 14 (E2E updates + grid updates) | **Medium** | Route-level broadcast emission (4 routes), out-of-order rejection, isDuplicate refresh |
| Concurrent Edit Detection | 14 (service + store + indicators) | **Medium** | Disconnect cleanup broadcast, multi-edit per row, stale lock cleanup, live E2E edit indicator |
| Conflict Resolution | 25 (version check + modal + routes) | **High** | End-to-end conflict flow (409 -> modal -> forceOverwrite), Keep Theirs cell revert |
| Import Broadcast | 5 (store + hook) | **Low** | Route-level emission, import banner rendering, multi-physician broadcast |
| Connection Resilience | 8 (config + E2E reconnect) | **Low** | Room re-join after reconnect, data refresh after reconnect, max retry exhaustion, multi-tab |
| Cascading Edits | 0 | **None** | All cascade scenarios untested |
| Audit Trail | 2 (forceOverwrite audit) | **Low** | Normal save audit detail, Keep Theirs no-audit |
| Edge Cases | 0 | **None** | Row delete during edit, rapid edits, multi-tab, disconnected save, derived field conflict, room isolation |
| Type Safety | 4 (toGridRowPayload) | **Medium** | Absence of removed fields, full payload structure assertion |

### Proposed New Test Count

| Layer | New Tests | Details |
|-------|-----------|---------|
| Backend Jest | 17 | Server init (1), room handlers (3), broadcast emission (4), disconnect cleanup (1), stale edit cleanup (1), import routes (2), audit trail (2), version check edge (2), type safety (1) |
| Frontend Vitest | 12 | PatientGrid remote handlers (4), conflict flow integration (3), cascade handling (2), cellClass edit indicator (2), rapid edit version tracking (1) |
| Playwright E2E | 9 | HTTP-only fallback (1), admin room switch (1), edit indicator live (1), conflict strengthen (1), reconnect with data refresh (1), max retry exhaustion (1), multi-tab (1), row delete during edit (1), room isolation (1) |
| Cypress E2E | 1 | Cell flash animation trigger (1) |
| **Total** | **39** | |

### Priority Ranking

| Priority | Area | Rationale |
|----------|------|-----------|
| **P0 - Critical** | Connection Resilience (reconnect + room re-join + data refresh) | Silent data staleness is the highest-risk failure mode |
| **P0 - Critical** | Route-level broadcast emission (row:updated, row:created, row:deleted) | Without broadcast, no real-time sync works |
| **P0 - Critical** | Stale edit lock cleanup | Zombie edit indicators block UX indefinitely |
| **P1 - High** | Cascading edit conflict handling | Cascade can silently destroy in-progress work |
| **P1 - High** | Multi-tab scenarios | Common user behavior, untested |
| **P1 - High** | Edge case: row deleted during edit | Data integrity risk |
| **P2 - Medium** | Import broadcast at route level | Import is less frequent but affects many rows |
| **P2 - Medium** | Type safety (tracking3 removal) | Prevents regression if schema drifts |
| **P2 - Medium** | Audit trail completeness | Required for compliance |
| **P3 - Low** | Server initialization test | Low risk of regression |
| **P3 - Low** | Room authorization (STAFF assignment check) | Existing HTTP auth likely covers most of this path |

---

## Assumptions and Constraints

### Assumptions

- **ASM-1:** The existing parallel-editing feature is fully implemented and functional. This test plan is for verifying existing behavior, not driving new feature development.
- **ASM-2:** Backend Jest tests use ESM with `--experimental-vm-modules` and `jest.unstable_mockModule()` for dynamic imports. All new backend tests must follow this pattern.
- **ASM-3:** Playwright E2E tests require a running local development environment (backend + frontend + database). They cannot mock the Socket.IO server.
- **ASM-4:** Cypress E2E tests run in a single browser context and cannot simulate two concurrent users. Socket.IO behavior must be simulated via custom events or direct DOM manipulation for AG Grid interaction tests.
- **ASM-5:** The `tracking3` field has been removed from the codebase. No test should reference it. The `depressionScreeningStatus` field mentioned in design docs is not present in the active Socket.IO types.
- **ASM-6:** Test accounts `ko037291@gmail.com` and `staff1@clinic.com` with password `welcome100` are available in the test database. Both accounts are assigned to view the same physician's data (required for multi-user E2E tests).

### Constraints

- **CON-1:** Cypress cannot test true multi-user Socket.IO scenarios (single browser context limitation). Multi-user tests must use Playwright with multiple browser contexts.
- **CON-2:** Playwright cannot reliably interact with AG Grid dropdown editors (known limitation documented in `TESTING.md`). Grid editing E2E for dropdowns must use Cypress.
- **CON-3:** The reconnection E2E tests use Playwright's `page.route()` to block Socket.IO requests, which simulates network disruption but not a true server crash.
- **CON-4:** Mock-based unit tests (Jest/Vitest) verify call patterns and state transitions but not actual Socket.IO message delivery over the wire. Integration and E2E tests fill this gap.
- **CON-5:** The test suite must not exceed the timing thresholds in TRC-NFR-P1 through TRC-NFR-P4 to maintain CI pipeline performance.

---

## Dependencies

### Depends On (Existing, Completed)

- **parallel-editing feature** -- All source code in `socketManager.ts`, `socketAuth.ts`, `versionCheck.ts`, `socketService.ts`, `realtimeStore.ts`, `useSocket.ts`, `ConflictModal.tsx`, `StatusBar.tsx` (all implemented)
- **AG Grid PatientGrid** -- `PatientGrid.tsx` with `PatientGridHandle` imperative API (`handleRemoteRowUpdate`, `handleRemoteRowCreate`, `handleRemoteRowDelete`, `handleDataRefresh`)
- **Test infrastructure** -- Jest, Vitest, Playwright, Cypress configurations and custom commands
- **Test database** -- Seeded with test accounts and patient data

### New Dependencies

- None. All testing frameworks are already configured. No new npm packages are required.

---

## Integration Points

### Test Files to Create

| Framework | File Path | Tests | Covers Requirements |
|-----------|-----------|-------|-------------------|
| Backend Jest | `backend/src/services/__tests__/socketManager.init.test.ts` | 4 | TRC-R1, TRC-R2 |
| Backend Jest | `backend/src/services/__tests__/socketManager.handlers.test.ts` | 5 | TRC-R2, TRC-R3, TRC-R5 |
| Backend Jest | `backend/src/routes/__tests__/data.routes.broadcast.test.ts` | 6 | TRC-R4, TRC-R10 |
| Backend Jest | `backend/src/routes/__tests__/import.routes.broadcast.test.ts` | 2 | TRC-R7 |
| Backend Jest | `backend/src/services/__tests__/versionCheck.edge.test.ts` | 2 | TRC-R6, TRC-R11, TRC-R12 |
| Frontend Vitest | `frontend/src/components/grid/PatientGrid.remote.test.tsx` | 8 | TRC-R4, TRC-R5, TRC-R9, TRC-R11 |
| Frontend Vitest | `frontend/src/components/grid/PatientGrid.conflict.test.tsx` | 3 | TRC-R6, TRC-R10 |
| Frontend Vitest | `frontend/src/hooks/useSocket.reconnect.test.ts` | 1 | TRC-R8 |
| Playwright E2E | `frontend/e2e/parallel-editing-resilience.spec.ts` | 4 | TRC-R1, TRC-R8 |
| Playwright E2E | `frontend/e2e/parallel-editing-edge-cases.spec.ts` | 5 | TRC-R9, TRC-R11 |
| Cypress E2E | `frontend/cypress/e2e/parallel-editing-flash-animation.cy.ts` | 1 | TRC-R4 |

### Existing Test Files to Extend

| Framework | File Path | New Tests | Covers Requirements |
|-----------|-----------|-----------|-------------------|
| Frontend Vitest | `frontend/src/hooks/useSocket.test.ts` | 1 | TRC-R3 (self-filter in onPresenceUpdate) |
| Frontend Vitest | `frontend/src/components/modals/ConflictModal.test.tsx` | 0 | Already comprehensive |
| Frontend Vitest | `frontend/src/stores/realtimeStore.test.ts` | 0 | Already comprehensive |
