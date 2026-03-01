# Feature 6: Real-Time Collaboration — Workflow Audit

## Workflows Identified

1. **WF-1: Socket Connection** — User logs in → socket connects → joins physician room → presence announced
2. **WF-2: Presence Updates** — Other users join/leave → presence list updates → active editors shown
3. **WF-3: Remote Cell Edit Indicator** — Another user edits a cell → CSS class applied → orange dashed border
4. **WF-4: Remote Row Update** — Another user saves a cell → row:updated event → grid row refreshes
5. **WF-5: Remote Row Create** — Another user adds a row → row:created event → new row appears
6. **WF-6: Remote Row Delete** — Another user deletes a row → row:deleted event → row disappears
7. **WF-7: Edit Conflict Detection** — User A and User B edit same cell → User B gets 409 VERSION_CONFLICT
8. **WF-8: Conflict Resolution Modal** — 409 received → modal shows field comparison → user chooses
9. **WF-9: Conflict Keep Mine** — User chooses "Keep Mine" → PUT with forceOverwrite=true → audit logged
10. **WF-10: Conflict Keep Theirs** — User chooses "Keep Theirs" → reverts to server row (no API call)
11. **WF-11: Data Refresh on Import** — Import completes → data:refresh event should broadcast
12. **WF-12: Reconnection** — Socket disconnects → auto-reconnect → re-join room → refresh data
13. **WF-13: Stale Lock Cleanup** — User disconnects without releasing → server cleans up in disconnect handler

---

## Critical Gaps Found

### 1. DATA:REFRESH EVENT NOT BROADCAST (HIGH)
- **Location**: Frontend `socketService.ts` line 125-127 defines the listener
- **Issue**: No backend code broadcasts `data:refresh` to rooms after import
- **Impact**: When imports complete, other connected users won't know to refresh
- **Note**: Backend broadcasts `import:started` and `import:completed` but NOT `data:refresh`

### 2. ROOM:JOIN / ROOM:LEAVE HANDLER NOT TESTED (HIGH)
- **Location**: `socketManager.ts` lines 55-65
- **Issue**: Handlers exist but NOT covered by backend tests
- **What's NOT tested**: Room join broadcast, room authorization for STAFF, room leave presence broadcast, stale edit cleanup on leave

### 3. OUT-OF-ORDER BROADCAST PROTECTION NOT TESTED (MEDIUM)
- **Location**: `PatientGrid.tsx` lines 195-202
- **Code**: Protection EXISTS — compares `updatedAt` timestamps and discards older updates
- **Gap**: No test verifies this protection

### 4. STALE EDIT LOCK CLEANUP NOT TESTED (MEDIUM)
- **Location**: `socketManager.ts` line 169-183 disconnect handler
- **Missing**: No timeout-based cleanup if `editing:stop` never arrives

### 5. VERSION CHECK MISSING DETAILED CONFLICT FIELD INFO (MEDIUM)
- **Location**: `versionCheck.ts` lines 136-155
- **Issue**: Returns `conflictFields: string[]` (names only), but frontend needs `baseValue`, `theirValue`, `yourValue`
- **Gap**: Reconstruction happens in `useGridCellUpdate.ts` using potentially stale `oldValue`

### 6. PRESENCE FILTER LOGIC NOT TESTED (LOW)
- **Location**: `useSocket.ts` lines 109-114 — filters out current user from presence list
- **Gap**: Test wires the handler but doesn't verify filter logic

### 7. MULTIPLE CONCURRENT EDIT INDICATORS NOT TESTED (LOW)
- **Location**: `useRemoteEditClass.ts` — applies CSS class per cell
- **Gap**: No test for 3+ users editing different cells in same row

### 8. CELL FLASH ANIMATION NOT TESTED (MEDIUM)
- **Location**: `PatientGrid.tsx` line 232 — `gridApi.flashCells()`
- **Gap**: Animation triggered but no test verifies it displays

### 9. EDIT CONFLICT DURING ACTIVE EDITING NOT TESTED (MEDIUM)
- **Location**: `PatientGrid.tsx` lines 204-223 — detects remote update to currently-editing cell
- **Gap**: No E2E test verifies the UX flow (stop editing, show toast, preserve data)

### 10. RECONNECTION DATA REFRESH NOT GUARANTEED (LOW)
- **Location**: `useSocket.ts` lines 54-65
- **Issue**: On reconnect, joins room and calls `onDataRefresh()`, but if refresh fails, data could be stale

---

## Test Coverage Summary

| Layer | Count | Files |
|-------|-------|-------|
| Backend Jest | ~57 | socketManager.test.ts, data.routes.version.test.ts, versionCheck.test.ts |
| Frontend Vitest | ~97 | PatientGrid.test.tsx, useSocket.test.ts, socketService.test.ts, realtimeStore.test.ts |
| Playwright E2E | ~11 | parallel-editing.spec.ts |
| Cypress E2E | ~11 | cell-editing-conflict.cy.ts |
| **Total** | **~176** | |

---

## Summary Table

| Workflow | Frontend | Backend | Tests | Coverage | Gaps |
|----------|----------|---------|-------|----------|------|
| WF-1: Socket Connection | useSocket.ts | socketManager.ts | Vitest, Jest | High | Room auth not tested |
| WF-2: Presence Updates | useSocket.ts, realtimeStore | socketManager.ts | Vitest, Jest | Medium | Filter logic not tested |
| WF-3: Remote Edit Indicator | useRemoteEditClass.ts | socketManager.ts | Vitest | Medium | Multi-user not tested |
| WF-4: Remote Row Update | PatientGrid.tsx | socketManager.ts | Vitest | Medium | Out-of-order not tested |
| WF-5: Remote Row Create | PatientGrid.tsx | socketManager.ts | Vitest | Medium | - |
| WF-6: Remote Row Delete | PatientGrid.tsx | socketManager.ts | Vitest | Medium | - |
| WF-7: Conflict Detection | useGridCellUpdate.ts | versionCheck.ts | Jest, Vitest | High | - |
| WF-8: Conflict Modal | ConflictModal | - | Vitest, Playwright | High | - |
| WF-9: Keep Mine | useGridCellUpdate.ts | data.routes.ts | Jest, Playwright | High | - |
| WF-10: Keep Theirs | useGridCellUpdate.ts | - | Vitest | Medium | - |
| WF-11: Data Refresh | socketService.ts | MISSING | NONE | **NONE** | **No broadcast** |
| WF-12: Reconnection | useSocket.ts | - | Vitest | Medium | Race condition |
| WF-13: Stale Lock | - | socketManager.ts | Partial | Low | No timeout |

---

## Critical Gaps (Prioritized)

1. **HIGH: data:refresh not broadcast** — Import completion doesn't notify other users
2. **HIGH: Room join/leave handlers not tested** — Authorization checks not verified
3. **MEDIUM: Out-of-order broadcast protection not tested** — Code exists but untested
4. **MEDIUM: Stale edit lock cleanup** — Relies on disconnect only (no timeout)
5. **MEDIUM: Cell flash animation not tested** — Visual feedback not verified
6. **MEDIUM: Conflict field reconstruction fragile** — baseValue from potentially stale oldValue
7. **MEDIUM: Edit conflict during active editing** — No E2E test for UX flow
8. **LOW: Presence filter logic** — Current user filtering not tested
9. **LOW: Multiple concurrent edit indicators** — 3+ users scenario not tested
10. **LOW: Reconnection data refresh** — Possible race condition
