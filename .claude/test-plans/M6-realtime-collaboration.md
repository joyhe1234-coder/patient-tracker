# M6 Real-Time Collaboration — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.7
**Spec:** `.claude/specs/test-realtime-collaboration/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `socketManager.test.ts` | Jest | 14 | Room naming, presence add/remove/dedup/disconnect, active edit add/replace/remove/clear |
| `versionCheck.test.ts` | Jest | 10 | Version match, conflict detection, auto-merge, forceOverwrite, toGridRowPayload |
| `socketAuth.test.ts` | Jest | 8 | JWT auth: no token, invalid, deactivated, success, multi-role |
| `data.routes.version.test.ts` | Jest | 6 | Backward compat, version match, 409 conflict, forceOverwrite, audit, auto-merge |
| `socketService.test.ts` | Vitest | 17 | Server URL, connect, status, event listeners, reconnection, event handlers |
| `realtimeStore.test.ts` | Vitest | 10 | Initial state, room users, active edits, import in progress |
| `ConflictModal.test.tsx` | Vitest | 13 | Modal rendering, values, null display, callbacks (Keep Mine/Theirs/Cancel) |
| `StatusBar.test.tsx` | Vitest | 13 | Row count, filter summary, connection status dots, presence count/tooltip |
| `useSocket.test.ts` | Vitest | 16 | Connect/disconnect lifecycle, room join/leave, handler wiring |
| `parallel-editing-connection.spec.ts` | Playwright | 3 | Connected status, presence join/leave |
| `parallel-editing-conflict.spec.ts` | Playwright | 3 | Two-user conflict, Keep Mine, Keep Theirs |
| `parallel-editing-reconnection.spec.ts` | Playwright | 2 | Reconnecting status, recovery |
| `parallel-editing-updates.spec.ts` | Playwright | 3 | Cell edit propagation, add row, delete row |
| `parallel-editing-edit-indicators.cy.ts` | Cypress | 4 | CSS class, cellFlash animation, dashed border, class removal |
| `parallel-editing-grid-updates.cy.ts` | Cypress | 3 | Cell value update, scroll preserved, selection maintained |
| `parallel-editing-row-operations.cy.ts` | Cypress | 4 | Rows loaded, selection, add/delete row count |
| **Total** | | **~129** | |

This module has the highest gap-to-coverage ratio (43%) due to the complexity of multi-user real-time scenarios.

---

## Planned New Tests (~13 tests)

### Tier 2 — Should Have (13 tests)

#### T2-1: WebSocket Reconnection + Stale Lock Cleanup (7 tests)

**Gap:** Connection resilience is the highest-risk area. Room re-join after reconnect, data refresh after reconnect, and stale edit lock cleanup are all untested. The spec identifies these as P0-Critical.

**Spec refs:** TRC-R8-AC3, TRC-R8-AC4, TRC-R5-AC8, TRC-R5-T5, TRC-R8-T1 through TRC-R8-T3

**Files:**
- `frontend/src/hooks/useSocket.test.ts` (extend)
- `backend/src/services/__tests__/socketManager.test.ts` (extend)
- `frontend/e2e/parallel-editing-reconnection.spec.ts` (extend)

| # | Test Name | Framework | What It Verifies |
|---|-----------|-----------|-----------------|
| 1 | `useSocket re-joins room after reconnect` | Vitest | When `onConnectionChange('connected')` fires after previous `'disconnected'`, `joinRoom(selectedPhysicianId)` is called again |
| 2 | `useSocket triggers data refresh after reconnect` | Vitest | After reconnect, `onDataRefresh()` callback is called to get fresh grid data |
| 3 | `socketManager clears stale edits on disconnect` | Jest | When socket disconnects, `clearEditsForSocket(socketId)` is called and `editing:inactive` broadcast for each cleared edit |
| 4 | `socketManager room:join handler broadcasts presence:update` | Jest | When socket sends `room:join`, handler calls `addUserToRoom()` and emits `presence:update` to room |
| 5 | `socketManager room:leave handler clears edits and broadcasts` | Jest | When socket sends `room:leave`, edits cleared for that socket, `presence:update` broadcast |
| 6 | `Playwright: reconnect restores Connected status and refreshes data` | Playwright | Block socket.io → "Disconnected" → unblock → "Connected" + grid data refreshed |
| 7 | `Playwright: max retry exhaustion shows Offline mode` | Playwright | Block socket.io until retries exhaust → "Offline mode" → editing still works via HTTP |

**Implementation pattern (Vitest — reconnection):**
```typescript
it('re-joins room after reconnect', () => {
  const { result } = renderHook(() => useSocket({
    token: 'test-jwt',
    selectedPhysicianId: 5,
    onDataRefresh: vi.fn(),
  }));

  // Simulate disconnect then reconnect
  const connectionHandler = mockSocketService.onConnectionChange.mock.calls[0]?.[0];
  connectionHandler('disconnected');
  connectionHandler('connected');

  expect(mockSocketService.joinRoom).toHaveBeenCalledWith(5);
});
```

---

#### T2-2: Concurrent Edit Conflict Modal Flow (6 tests)

**Gap:** The ConflictModal component is well-tested in isolation, but the integration flow (409 response → modal opens → user action → resolution) is not tested at the PatientGrid level. The spec identifies Keep Mine → forceOverwrite PUT and Keep Theirs → cell revert as gaps.

**Spec refs:** TRC-R6-AC7, TRC-R6-AC8, TRC-R6-T1 through TRC-R6-T4, TRC-R9

**Files:**
- `frontend/src/components/grid/__tests__/` (new integration test or extend existing)
- `frontend/e2e/parallel-editing-conflict.spec.ts` (extend)

| # | Test Name | Framework | What It Verifies |
|---|-----------|-----------|-----------------|
| 1 | `409 response opens ConflictModal with correct conflict data` | Vitest | PUT returns 409 → ConflictModal rendered with serverRow, conflictFields, changedBy from response |
| 2 | `Keep Mine triggers forceOverwrite PUT` | Vitest | Clicking "Keep Mine" callback sends second PUT with `forceOverwrite: true` |
| 3 | `Keep Theirs reverts cell to server value` | Vitest | Clicking "Keep Theirs" sets cell value to `serverRow[field]`, no second PUT sent |
| 4 | `Cascade edit cancels remote user's in-progress edit` | Vitest | `handleRemoteRowUpdate` on actively-edited row exits edit mode and shows toast |
| 5 | `Multi-field cascade updates atomically` | Vitest | Remote update with multiple null fields (cascade) updates all via single `setData()` call |
| 6 | `Playwright: Keep Mine resolves conflict on both users' grids` | Playwright | User A edits, User B edits same cell → 409 → User B clicks Keep Mine → both grids show User B's value |

**Implementation pattern (Vitest — 409 integration):**
```typescript
it('409 response opens ConflictModal with correct conflict data', async () => {
  // Mock axios to return 409 with conflict payload
  const conflictResponse = {
    response: {
      status: 409,
      data: {
        code: 'VERSION_CONFLICT',
        serverRow: { measureStatus: 'Completed' },
        conflictFields: ['measureStatus'],
        changedBy: 'Dr. Smith',
      },
    },
  };
  vi.mocked(axios.put).mockRejectedValueOnce(conflictResponse);

  // Trigger cell edit save
  // ... trigger save via grid API mock ...

  // Verify ConflictModal opens with correct data
  expect(screen.getByText('Edit Conflict')).toBeInTheDocument();
  expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
});
```

---

## Tests NOT Planned (Deferred to Tier 3)

| Gap | Reason Deferred |
|-----|----------------|
| Multi-tab WebSocket scenarios (TRC-R11-AC3) | Hard to test reliably; Playwright can do it but flaky |
| Route-level broadcast emission (TRC-R4-AC1-AC4) | 4 tests verifying `broadcastToRoom` in data routes; covered indirectly by E2E update tests |
| Type safety: `toGridRowPayload` field assertions (TRC-R12) | Low regression risk; TypeScript compiler catches field drift |
| Server initialization singleton test (TRC-R1-T1) | Low risk; server starts reliably in all environments |
| Room authorization for STAFF (TRC-R2-AC8) | HTTP auth layer already blocks unauthorized access |
| Import broadcast at route level (TRC-R7) | Import E2E tests cover the user-facing flow |
| Audit trail for normal saves (TRC-R10-AC1) | data.routes.version.test.ts partially covers this |
| Row deleted while editing (TRC-R11-AC1) | Complex E2E, low frequency scenario |
| Rapid sequential edits version tracking (TRC-R11-AC2) | Low risk; each PUT is independent |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `frontend/src/hooks/useSocket.test.ts` | Extend | +2 | TODO |
| `backend/src/services/__tests__/socketManager.test.ts` | Extend | +3 | TODO |
| `frontend/e2e/parallel-editing-reconnection.spec.ts` | Extend | +2 | TODO |
| `frontend/src/components/grid/__tests__/conflictFlow.test.tsx` | New | +5 | TODO |
| `frontend/e2e/parallel-editing-conflict.spec.ts` | Extend | +1 | TODO |
| **Total** | | **13** | |

---

## Done Criteria

- [ ] All 13 tests written and passing
- [ ] No regressions in existing M6 tests (~129 baseline)
- [ ] Reconnection flow verified: room re-join + data refresh after socket reconnect
- [ ] Stale edit lock cleanup verified: disconnect clears active edit indicators
- [ ] Conflict modal integration verified: 409 → modal → Keep Mine/Theirs resolution
- [ ] Cascade edit cancellation verified: remote cascade exits local edit mode
- [ ] Playwright reconnection E2E: Connected → Disconnected → Connected with data refresh
- [ ] Full 4-layer pyramid passes
