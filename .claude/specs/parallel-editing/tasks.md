# Implementation Tasks: Parallel Editing (Real-Time Collaborative Editing with Conflict Resolution)

## Task Overview

This implementation adds real-time collaborative editing capabilities to the Patient Tracker using Socket.IO. The approach is additive — Socket.IO sits on top of the existing HTTP CRUD layer, providing graceful degradation to HTTP-only mode if WebSocket connectivity fails. The design uses optimistic concurrency control (version checking via the existing `updatedAt` timestamp) rather than pessimistic locking, allowing all users to edit freely with conflicts detected and resolved at save time.

**Key Components:**
- 7 new components: SocketManager, SocketAuth, VersionCheck, SocketService, RealtimeStore, useSocket, ConflictModal
- 6 modified components: index.ts, data.routes.ts, import.routes.ts, MainPage.tsx, PatientGrid.tsx, StatusBar.tsx
- 0 database schema changes (leverages existing `updatedAt` field)

**Dependency Strategy:**
Tasks are ordered to minimize blocking dependencies:
1. Backend infrastructure first (Socket.IO server, auth, version check)
2. Frontend infrastructure (socket service, store, hook)
3. UI components (modal, status indicators)
4. Integration (route handlers emit events, grid handles events)
5. Testing (5-layer pyramid: Jest → Vitest → Playwright → Cypress → MCP visual review)

## Steering Document Compliance

**structure.md conventions followed:**
- Backend services in `backend/src/services/` (camelCase: `socketManager.ts`, `versionCheck.ts`)
- Backend middleware in `backend/src/middleware/` (camelCase: `socketAuth.ts`)
- Frontend services in `frontend/src/services/` (new directory, camelCase: `socketService.ts`)
- Frontend stores in `frontend/src/stores/` (camelCase: `realtimeStore.ts`)
- Frontend hooks in `frontend/src/hooks/` (new directory, camelCase: `useSocket.ts`)
- Frontend components in `frontend/src/components/modals/` (PascalCase: `ConflictModal.tsx`)
- Tests co-located: `__tests__/` subdirectories for unit tests, `e2e/` for E2E tests

**tech.md patterns followed:**
- TypeScript with explicit interfaces for all Socket.IO events
- ESM imports (`import`/`export`)
- Zustand for state management (follows `authStore` pattern)
- Tailwind CSS for styling (utility classes only)
- Jest (backend unit), Vitest (frontend unit), Playwright (E2E flows), Cypress (AG Grid interactions), MCP Playwright (visual review)

## Atomic Task Requirements

**Each task meets these criteria:**
- **File Scope**: Touches 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes by an experienced developer
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Exact files to create/modify specified
- **Agent-Friendly**: Clear input/output with minimal context switching

---

## Phase 1: Backend Infrastructure (Socket.IO Server, Auth, Version Check)

### 1.1 Backend Socket.IO Foundation

- [x] 1. Create Socket.IO event type definitions
  - **File:** `backend/src/types/socket.ts` (new)
  - Define TypeScript interfaces for `ServerToClientEvents`, `ClientToServerEvents`, `SocketData`, `PresenceUser`
  - Export `GridRowPayload` type matching the existing API response format
  - Export `ImportStats` type for import completion events
  - Purpose: Establish type safety for all Socket.IO communications
  - _Requirements: PE-R1, PE-R2, PE-R3, PE-R8_
  - _Leverage: `backend/src/types/express.d.ts` (for consistent naming patterns)_

- [x] 2. Create Socket Manager service with initialization and room management
  - **File:** `backend/src/services/socketManager.ts` (new)
  - Implement `initializeSocketIO(httpServer)` to create Socket.IO server with CORS config
  - Implement `getRoomName(physicianId)` to format room names (`physician:{id}` or `physician:unassigned`)
  - Implement module-level singleton pattern (store `io` instance in module scope)
  - Export `getIO()` to retrieve the Socket.IO server instance
  - Purpose: Centralize Socket.IO server initialization and room naming conventions
  - _Requirements: PE-R1-AC7, PE-R6-AC1, PE-R6-AC2_
  - _Leverage: `backend/src/config/index.ts` (CORS settings), `socket.io` package_

- [x] 3. Add presence tracking to Socket Manager
  - **File:** `backend/src/services/socketManager.ts` (continue from task 2)
  - Add in-memory Map to track users per room: `Map<roomName, Set<SocketData>>`
  - Implement `getPresenceForRoom(room)` to return array of `PresenceUser` objects
  - Implement `broadcastPresenceUpdate(room)` to emit `presence:update` event
  - Purpose: Track which users are in each physician room for presence indicators
  - _Requirements: PE-R2-AC1, PE-R2-AC2, PE-R2-AC3_
  - _Leverage: `backend/src/types/socket.ts` (PresenceUser interface)_

- [x] 4. Add active edit tracking to Socket Manager
  - **File:** `backend/src/services/socketManager.ts` (continue from task 3)
  - Add in-memory Map to track active edits: `Map<roomName, Set<ActiveEdit>>`
  - Implement `addActiveEdit(room, rowId, field, userName)` and `removeActiveEdit(room, rowId, field)`
  - Implement `clearEditsForSocket(socketId)` to remove all edits when a socket disconnects
  - Export `getActiveEditsForRoom(room)` to retrieve current edits
  - Purpose: Track which cells are being edited by which users
  - _Requirements: PE-R3-AC1, PE-R3-AC4, PE-R3-AC6_
  - _Leverage: `backend/src/types/socket.ts` (ActiveEdit interface)_

- [x] 5. Add broadcast helper functions to Socket Manager
  - **File:** `backend/src/services/socketManager.ts` (continue from task 4)
  - Implement `broadcastToRoom(room, event, data, excludeSocketId?)` using `io.to(room).except(excludeSocketId).emit(event, data)`
  - Implement `emitToSocket(socketId, event, data)` for targeted messages
  - Purpose: Provide clean API for route handlers to broadcast events
  - _Requirements: PE-R8-AC1, PE-R8-AC2, PE-R8-AC3, PE-R8-AC5_
  - _Leverage: Socket.IO `to()` and `except()` APIs_

- [x] 6. Create Socket.IO authentication middleware
  - **File:** `backend/src/middleware/socketAuth.ts` (new)
  - Implement `socketAuthMiddleware(socket, next)` to verify JWT from `socket.handshake.auth.token`
  - Call `verifyToken` and `findUserById` from authService (reuse existing logic)
  - Attach user data to `socket.data` (userId, email, displayName, roles)
  - Reject connection with `Error('Authentication failed')` if token invalid
  - Purpose: Authenticate Socket.IO connections using the same JWT as HTTP
  - _Requirements: PE-R6-AC2, PE-R6-AC3, PE-NFR-S1_
  - _Leverage: `backend/src/services/authService.ts` (`verifyToken`, `findUserById`), `backend/src/middleware/auth.ts` (JWT logic pattern)_

- [x] 7. Wire Socket.IO connection handlers in Socket Manager with room authorization
  - **File:** `backend/src/services/socketManager.ts` (continue from task 5)
  - In `initializeSocketIO`, attach `socketAuthMiddleware` as `io.use(socketAuthMiddleware)`
  - Implement `io.on('connection', (socket) => {...})` handler
  - Handle `room:join` event:
    - Verify user has access to the physician data (PE-NFR-S2): check if user is assigned to physician or is admin
    - Query `prisma.physician.findUnique` to verify physician exists and user has permission
    - If unauthorized, emit error event and reject room join
    - If authorized, add socket to room, add to presence map, broadcast `presence:update`
  - Handle `room:leave` event: remove socket from room, remove from presence, broadcast `presence:update`
  - Handle `editing:start` event: call `addActiveEdit`, broadcast `editing:active` to room
  - Handle `editing:stop` event: call `removeActiveEdit`, broadcast `editing:inactive` to room
  - Handle `disconnect` event: clean up presence and active edits, broadcast updates
  - Purpose: Manage Socket.IO connection lifecycle with room-level authorization
  - _Requirements: PE-R1-AC7, PE-R1-AC8, PE-R1-AC9, PE-R2-AC3, PE-R3-AC1, PE-R3-AC4, PE-R3-AC6, PE-NFR-S2_
  - _Leverage: `backend/src/middleware/socketAuth.ts` (auth middleware), Socket.IO event handlers, prisma_

- [ ] 8. Attach Socket.IO server to HTTP server in index.ts
  - **File:** `backend/src/index.ts` (modify)
  - Import `initializeSocketIO` from `socketManager.ts`
  - After `const server = createServer(app)` (line 16), call `initializeSocketIO(server)`
  - Wrap in try/catch: log error if Socket.IO fails to initialize, but allow HTTP server to continue
  - In `SIGTERM` and `SIGINT` handlers, close Socket.IO connections before `prisma.$disconnect()`
  - Purpose: Integrate Socket.IO into the existing server lifecycle
  - _Requirements: PE-R6-AC1, PE-NFR-R1_
  - _Leverage: Existing `createServer(app)` (line 16), graceful shutdown handlers (lines 67-83)_

### 1.2 Optimistic Concurrency Control (Version Check)

- [ ] 9. Create version check service
  - **File:** `backend/src/services/versionCheck.ts` (new)
  - Define `ConflictResult` interface with `hasConflict`, `conflictFields`, `serverRow`, `changedBy`
  - Implement `checkVersion(measureId, expectedVersion, incomingChangedFields)` function
  - Fetch current row from database using `prisma.patientMeasure.findUnique`
  - Compare `expectedVersion` (ISO timestamp) against `row.updatedAt`
  - If timestamps match, return `{ hasConflict: false }`
  - If timestamps differ, query AuditLog to find who made the change (optional, return null if not found)
  - Compare `incomingChangedFields` against fields changed since `expectedVersion` (check AuditLog for recent field-level changes)
  - If fields overlap, return `{ hasConflict: true, conflictFields, serverRow, changedBy }`
  - If fields do NOT overlap, return `{ hasConflict: false }` (auto-merge case)
  - Purpose: Detect field-level conflicts for optimistic concurrency control
  - _Requirements: PE-R4-AC1, PE-R4-AC2, PE-R4-AC3, PE-R4-AC6, PE-R4-AC7_
  - _Leverage: `backend/src/config/database.ts` (prisma singleton), `backend/src/routes/data.routes.ts` (existing row fetch pattern)_

- [ ] 10. Create unit tests for version check service
  - **File:** `backend/src/services/__tests__/versionCheck.test.ts` (new)
  - Test: matching version passes (no conflict)
  - Test: mismatched version with overlapping fields returns conflict
  - Test: mismatched version with non-overlapping fields returns no conflict (auto-merge)
  - Test: missing expectedVersion returns no conflict (backward compatibility)
  - Test: changedBy is correctly identified from AuditLog
  - Purpose: Ensure version check logic is correct before integrating into routes
  - _Requirements: PE-R4_
  - _Leverage: Existing test patterns from `backend/src/services/__tests__/authService.test.ts`_

### 1.3 Backend Socket.IO Testing

- [ ] 11. Create unit tests for Socket Manager (initialization and rooms)
  - **File:** `backend/src/services/__tests__/socketManager.test.ts` (new)
  - Test: `initializeSocketIO` creates Socket.IO server instance
  - Test: `getRoomName` formats physician rooms correctly (`physician:5`, `physician:unassigned`)
  - Test: `getIO` returns the singleton instance
  - Mock HTTP server for testing
  - Purpose: Verify Socket.IO server setup and room naming
  - _Requirements: PE-R1-AC7, PE-R6-AC1_
  - _Leverage: `jest`, `socket.io` test utilities_

- [ ] 12. Create unit tests for Socket Manager (presence and edits)
  - **File:** `backend/src/services/__tests__/socketManager.test.ts` (continue from task 11)
  - Test: presence tracking adds/removes users correctly
  - Test: `getPresenceForRoom` returns correct user list
  - Test: active edit tracking adds/removes edits correctly
  - Test: `clearEditsForSocket` removes all edits for a disconnected socket
  - Test: `broadcastPresenceUpdate` emits correct event payload
  - Purpose: Verify presence and active edit management logic
  - _Requirements: PE-R2, PE-R3_
  - _Leverage: In-memory Map assertions_

- [ ] 13. Create unit tests for Socket Auth middleware
  - **File:** `backend/src/middleware/__tests__/socketAuth.test.ts` (new)
  - Test: valid JWT token is accepted, `socket.data` is populated
  - Test: expired JWT token is rejected
  - Test: missing JWT token is rejected
  - Test: inactive user is rejected
  - Mock `verifyToken` and `findUserById` from authService
  - Purpose: Ensure Socket.IO authentication behaves like HTTP auth
  - _Requirements: PE-R6-AC2, PE-R6-AC3, PE-NFR-S1_
  - _Leverage: Existing auth tests from `backend/src/middleware/__tests__/auth.test.ts`_

---

## Phase 2: Backend API Integration (Route Modifications for Events)

### 2.1 Data Routes Version Check and Events

- [ ] 14a. Create Express middleware to attach socket ID to requests
  - **File:** `backend/src/middleware/socketIdMiddleware.ts` (new)
  - Implement middleware that reads `X-Socket-ID` header from request
  - Set `req.socketId` (string | undefined) for use in route handlers
  - Export as default middleware function
  - Purpose: Enable excluding the originating socket from Socket.IO broadcasts
  - _Requirements: PE-R8-AC1, PE-R8-AC5_
  - _Leverage: Express middleware patterns from `backend/src/middleware/auth.ts`_

- [ ] 14b. Add socket ID middleware to data and import routes
  - **Files:** `backend/src/routes/data.routes.ts`, `backend/src/routes/import.routes.ts` (modify)
  - Import `socketIdMiddleware` from `backend/src/middleware/socketIdMiddleware.ts`
  - Apply middleware to all routes: `router.use(socketIdMiddleware)`
  - Purpose: Populate `req.socketId` for broadcast exclusion
  - _Requirements: PE-R8-AC1, PE-R8-AC5_
  - _Leverage: Existing middleware chain in routes_

- [ ] 14. Add expectedVersion and forceOverwrite fields to PUT /api/data/:id request handling
  - **File:** `backend/src/routes/data.routes.ts` (modify)
  - Destructure `expectedVersion` and `forceOverwrite` from `req.body` in the PUT handler
  - If `expectedVersion` is provided and `forceOverwrite` is not `true`, call `checkVersion(measureId, expectedVersion, changedFields)`
  - If conflict detected, return 409 status with conflict response body (see design.md ConflictResponse interface)
  - If no conflict, proceed with existing update logic
  - Purpose: Implement optimistic concurrency control on cell edits
  - _Requirements: PE-R4-AC1, PE-R4-AC2, PE-R4-AC3, PE-R4-AC4_
  - _Leverage: `backend/src/services/versionCheck.ts`, existing PUT handler (lines 310-350 of data.routes.ts)_

- [ ] 15. Emit Socket.IO row:updated event after successful PUT
  - **File:** `backend/src/routes/data.routes.ts` (continue from task 14)
  - After successful `prisma.patientMeasure.update`, call `socketManager.broadcastToRoom(room, 'row:updated', { row: updatedRowData, changedBy: req.user.displayName }, req.socketId)`
  - Determine room name from `physicianId` query param or `updatedRow.patient.ownerId`
  - Exclude the originating socket using `req.socketId` (need to track socketId in req, set by middleware)
  - Purpose: Notify other users of successful cell edits
  - _Requirements: PE-R8-AC1, PE-R8-AC5_
  - _Leverage: `backend/src/services/socketManager.ts` (`broadcastToRoom`)_

- [ ] 16. Emit Socket.IO row:created event after POST /api/data
  - **File:** `backend/src/routes/data.routes.ts` (modify)
  - After successful `prisma.patientMeasure.create`, call `socketManager.broadcastToRoom(room, 'row:created', { row: newRowData, changedBy: req.user.displayName }, req.socketId)`
  - Determine room from `physicianId` query param
  - Purpose: Notify other users when a new row is added
  - _Requirements: PE-R1-AC4, PE-R8-AC2_
  - _Leverage: `backend/src/services/socketManager.ts`, existing POST handler in data.routes.ts_

- [ ] 17. Emit Socket.IO row:deleted event after DELETE /api/data/:id
  - **File:** `backend/src/routes/data.routes.ts` (modify)
  - After successful `prisma.patientMeasure.delete`, call `socketManager.broadcastToRoom(room, 'row:deleted', { rowId: deletedId, changedBy: req.user.displayName }, req.socketId)`
  - Determine room from the deleted row's `patient.ownerId`
  - Purpose: Notify other users when a row is deleted
  - _Requirements: PE-R1-AC5, PE-R8-AC3_
  - _Leverage: `backend/src/services/socketManager.ts`, existing DELETE handler in data.routes.ts_

- [ ] 18. Emit Socket.IO row:created event after POST /api/data/duplicate
  - **File:** `backend/src/routes/data.routes.ts` (modify)
  - After successful duplicate operation, call `socketManager.broadcastToRoom(room, 'row:created', { row: duplicatedRowData, changedBy: req.user.displayName }, req.socketId)`
  - Determine room from `physicianId` query param
  - Purpose: Notify other users when a row is duplicated
  - _Requirements: PE-R1-AC6, PE-R8-AC4_
  - _Leverage: `backend/src/services/socketManager.ts`, existing duplicate handler in data.routes.ts_

### 2.2 Import Routes Events

- [ ] 19. Emit Socket.IO import:started and import:completed events in import routes
  - **File:** `backend/src/routes/import.routes.ts` (modify)
  - In POST /api/import/execute handler, before execution begins, call `socketManager.broadcastToRoom(room, 'import:started', { importedBy: req.user.displayName })`
  - After execution completes, call `socketManager.broadcastToRoom(room, 'import:completed', { importedBy: req.user.displayName, stats: resultStats })`
  - Broadcast to all affected physician rooms (may be multiple if import affects multiple physicians)
  - Purpose: Notify users when a bulk import is in progress and when it completes
  - _Requirements: PE-R10-AC1, PE-R10-AC2, PE-R8-AC7_
  - _Leverage: `backend/src/services/socketManager.ts`, existing import execute handler_

### 2.3 Audit Log Extension for Conflict Overrides

- [ ] 20. Add conflict-override metadata to audit log entries
  - **File:** `backend/src/routes/data.routes.ts` (modify, continue from task 14)
  - When `forceOverwrite: true` is set, add to AuditLog.changes JSON: `{ conflictOverride: true, overwrittenUserId, overwrittenUserEmail }`
  - Query the AuditLog for the most recent change to identify the overwritten user
  - Purpose: Create audit trail for forced conflict resolutions
  - _Requirements: PE-R11-AC2_
  - _Leverage: Existing audit log creation in data.routes.ts, `backend/src/config/database.ts` (prisma)_

### 2.4 Backend API Integration Testing

- [ ] 21. Create integration tests for version check in PUT /api/data/:id
  - **File:** `backend/src/routes/__tests__/data.routes.version.test.ts` (new)
  - Test: PUT with matching `expectedVersion` returns 200 OK
  - Test: PUT with mismatched `expectedVersion` and overlapping field returns 409 Conflict
  - Test: PUT with mismatched `expectedVersion` and non-overlapping fields returns 200 OK (auto-merge)
  - Test: PUT with `forceOverwrite: true` returns 200 OK regardless of version
  - Test: PUT without `expectedVersion` returns 200 OK (backward compatibility)
  - Test: Conflict response body includes `serverRow`, `conflictFields`, and `changedBy`
  - Use Jest + supertest + mock auth middleware
  - Purpose: Verify version check integration in the data routes
  - _Requirements: PE-R4_
  - _Leverage: Existing route tests from `backend/src/routes/__tests__/data.routes.test.ts`_

- [ ] 22. Create integration tests for Socket.IO event emissions
  - **File:** `backend/src/routes/__tests__/data.routes.socket.test.ts` (new)
  - Test: Successful PUT emits `row:updated` event to correct room
  - Test: Successful POST emits `row:created` event
  - Test: Successful DELETE emits `row:deleted` event
  - Test: Successful duplicate emits `row:created` event
  - Test: Originating socket is excluded from broadcast
  - Mock Socket.IO server and verify `broadcastToRoom` calls
  - Purpose: Verify Socket.IO events are emitted correctly from routes
  - _Requirements: PE-R8_
  - _Leverage: Jest mocks, `backend/src/services/socketManager.ts` (mock)_

---

## Phase 3: Frontend Infrastructure (Socket Service, Store, Hook)

### 3.1 Frontend Socket Service

- [ ] 23. Install socket.io-client dependency
  - **File:** `frontend/package.json` (modify)
  - Run `npm install socket.io-client@^4.7.5` in frontend directory
  - Verify version compatibility with backend Socket.IO version (socket.io@^4.7.5)
  - Purpose: Add Socket.IO client library to frontend dependencies
  - _Requirements: PE-R6-AC1_
  - _Leverage: npm package registry_

- [ ] 24a. Create frontend Socket.IO event type definitions
  - **File:** `frontend/src/types/socket.ts` (new)
  - Define TypeScript interfaces for all Socket.IO events (mirror backend types)
  - Define `ServerToClientEvents`, `ClientToServerEvents`, `PresenceUser`, `ActiveEdit`, `GridRow`, `ImportStats`
  - Purpose: Establish type safety for frontend Socket.IO communications
  - _Requirements: PE-R1, PE-R2, PE-R3, PE-R8_
  - _Leverage: Backend `backend/src/types/socket.ts` (mirror structure)_

- [ ] 24b. Add X-Socket-ID header to frontend API client
  - **File:** `frontend/src/api/axios.ts` (modify)
  - Import `socketService.getSocket()` to retrieve current socket ID
  - Add request interceptor to include `X-Socket-ID` header in all API requests
  - Only add header if socket is connected
  - Purpose: Enable backend to exclude originating socket from broadcasts
  - _Requirements: PE-R8-AC1, PE-R8-AC5_
  - _Leverage: Existing axios interceptor patterns in `frontend/src/api/axios.ts`_

- [ ] 24. Create Socket.IO service with connection management
  - **File:** `frontend/src/services/socketService.ts` (new)
  - Define `ConnectionStatus` type: `'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'offline'`
  - Define `SocketServiceEvents` interface with all event handler signatures
  - Implement `connect(token, handlers)` function to establish Socket.IO connection with JWT auth
  - Derive server URL from `window.location.origin` (same origin as HTTP API)
  - Configure Socket.IO reconnection: exponential backoff, 1s initial, 30s max, 10 max attempts
  - Store socket instance in module scope (singleton pattern)
  - Purpose: Manage Socket.IO client connection lifecycle
  - _Requirements: PE-R6-AC1, PE-R6-AC4, PE-NFR-R2_
  - _Leverage: `socket.io-client`, `frontend/src/api/axios.ts` (URL derivation pattern)_

- [ ] 25. Add event listener registration to Socket Service
  - **File:** `frontend/src/services/socketService.ts` (continue from task 24)
  - In `connect()`, register all server-to-client event listeners: `row:updated`, `row:created`, `row:deleted`, `data:refresh`, `import:started`, `import:completed`, `editing:active`, `editing:inactive`, `presence:update`
  - Call corresponding handler functions from `SocketServiceEvents`
  - Register `connect`, `disconnect`, `reconnect_attempt`, `reconnect`, `reconnect_failed`, `connect_error` events to update connection status
  - Purpose: Wire Socket.IO events to React state management
  - _Requirements: PE-R1, PE-R2, PE-R3, PE-R6-AC4, PE-R6-AC5, PE-R6-AC8_
  - _Leverage: Socket.IO client event API_

- [ ] 26. Add room join/leave and editing event emitters to Socket Service
  - **File:** `frontend/src/services/socketService.ts` (continue from task 25)
  - Implement `joinRoom(physicianId)` to emit `room:join` event
  - Implement `leaveRoom(physicianId)` to emit `room:leave` event
  - Implement `emitEditingStart(rowId, field)` to emit `editing:start` event
  - Implement `emitEditingStop(rowId, field)` to emit `editing:stop` event
  - Implement `disconnect()` to close the socket and clean up listeners
  - Export `getSocket()` to retrieve the socket instance
  - Purpose: Provide API for components to join rooms and signal editing state
  - _Requirements: PE-R1-AC7, PE-R1-AC8, PE-R3-AC1, PE-R3-AC4_
  - _Leverage: Socket.IO client `emit()` API_

### 3.2 Frontend Realtime Store

- [ ] 27. Create Realtime Zustand store with connection state
  - **File:** `frontend/src/stores/realtimeStore.ts` (new)
  - Define `RealtimeState` interface with `connectionStatus`, `roomUsers`, `activeEdits`, `importInProgress`, `importedBy`
  - Implement `create<RealtimeState>()` following authStore pattern (no persist needed)
  - Add action `setConnectionStatus(status)` to update connection state
  - Add action `setRoomUsers(users)` to update presence list
  - Purpose: Centralize real-time state management for connection, presence, and edits
  - _Requirements: PE-R2, PE-R3, PE-R6, PE-R7, PE-R10_
  - _Leverage: `zustand`, `frontend/src/stores/authStore.ts` (structure pattern)_

- [ ] 28. Add active edit and import state actions to Realtime Store
  - **File:** `frontend/src/stores/realtimeStore.ts` (continue from task 27)
  - Add action `addActiveEdit(edit: ActiveEdit)` to append to `activeEdits` array
  - Add action `removeActiveEdit(rowId, field)` to filter out from `activeEdits` array
  - Add action `clearActiveEdits()` to reset array (on disconnect)
  - Add action `setImportInProgress(inProgress, importedBy?)` to update import state
  - Purpose: Track which cells are being edited by other users and import status
  - _Requirements: PE-R3-AC1, PE-R3-AC4, PE-R10-AC1, PE-R10-AC3_
  - _Leverage: Zustand state update patterns_

### 3.3 Frontend Socket Hook

- [ ] 29. Create useSocket React hook with connection lifecycle
  - **File:** `frontend/src/hooks/useSocket.ts` (new)
  - Accept options: `{ onRowUpdated, onRowCreated, onRowDeleted, onDataRefresh }`
  - Use `useAuthStore` to get `token` and `selectedPhysicianId`
  - Use `useRealtimeStore` to update connection status and presence
  - In `useEffect` with dependency `[token]`: call `socketService.connect(token, handlers)` when token is available
  - Return cleanup function to call `socketService.disconnect()`
  - Purpose: Integrate Socket.IO with React component lifecycle
  - _Requirements: PE-R6-AC1, PE-R1-AC9_
  - _Leverage: `frontend/src/services/socketService.ts`, `frontend/src/stores/authStore.ts`, `frontend/src/stores/realtimeStore.ts`_

- [ ] 30. Add room join/leave logic to useSocket hook with token expiry handling
  - **File:** `frontend/src/hooks/useSocket.ts` (continue from task 29)
  - In `useEffect` with dependency `[selectedPhysicianId]`: call `socketService.joinRoom(selectedPhysicianId)` when it changes
  - Call `socketService.leaveRoom(previousPhysicianId)` before joining new room
  - Handle edge case: `selectedPhysicianId` is null (no room to join)
  - Handle mid-session token expiry (PE-NFR-S3): listen for `connect_error` with "Authentication failed" message
  - On auth error, call `authStore.logout()` and redirect to login page
  - Show toast notification: "Session expired. Please log in again."
  - Purpose: Automatically switch Socket.IO rooms when user changes physician selection, handle token expiry
  - _Requirements: PE-R1-AC7, PE-R1-AC8, PE-NFR-S3_
  - _Leverage: React `useEffect`, `useRef` to track previous physician ID, `authStore.logout()`_

- [ ] 31. Wire Socket.IO event handlers in useSocket to update store and call callbacks
  - **File:** `frontend/src/hooks/useSocket.ts` (continue from task 30)
  - In `socketService.connect` handlers object:
    - `onConnectionChange`: call `realtimeStore.setConnectionStatus(status)`
    - `onPresenceUpdate`: call `realtimeStore.setRoomUsers(users)`
    - `onEditingActive`: call `realtimeStore.addActiveEdit(edit)`
    - `onEditingInactive`: call `realtimeStore.removeActiveEdit(rowId, field)`
    - `onImportStarted`: call `realtimeStore.setImportInProgress(true, importedBy)`
    - `onImportCompleted`: call `realtimeStore.setImportInProgress(false)` and call `onDataRefresh()`
    - `onRowUpdated`, `onRowCreated`, `onRowDeleted`, `onDataRefresh`: call the corresponding callback from hook options
  - Purpose: Bridge Socket.IO events to Zustand store updates and component callbacks
  - _Requirements: PE-R1, PE-R2, PE-R3, PE-R10_
  - _Leverage: `frontend/src/stores/realtimeStore.ts` actions_

### 3.4 Frontend Service and Store Testing

- [ ] 32. Create unit tests for Realtime Store
  - **File:** `frontend/src/stores/realtimeStore.test.ts` (new)
  - Test: initial state is correct (disconnected, empty arrays)
  - Test: `setConnectionStatus` updates status
  - Test: `setRoomUsers` updates presence list
  - Test: `addActiveEdit` and `removeActiveEdit` correctly modify array
  - Test: `clearActiveEdits` resets array
  - Test: `setImportInProgress` updates import state
  - Purpose: Verify Zustand store logic
  - _Requirements: PE-R2, PE-R3, PE-R10_
  - _Leverage: Vitest, Zustand test utilities_

- [ ] 33. Create unit tests for Socket Service
  - **File:** `frontend/src/services/socketService.test.ts` (new)
  - Test: `connect()` establishes Socket.IO connection with JWT auth
  - Test: `disconnect()` closes socket
  - Test: `joinRoom()` and `leaveRoom()` emit correct events
  - Test: `emitEditingStart()` and `emitEditingStop()` emit correct events
  - Test: connection status changes trigger `onConnectionChange` callback
  - Mock `socket.io-client` for testing
  - Purpose: Verify Socket.IO client service behavior
  - _Requirements: PE-R1, PE-R3, PE-R6_
  - _Leverage: Vitest, socket.io-client mock utilities_

- [ ] 34. Create unit tests for useSocket hook
  - **File:** `frontend/src/hooks/useSocket.test.ts` (new)
  - Test: connects on mount when token is available
  - Test: disconnects on unmount
  - Test: re-joins room when `selectedPhysicianId` changes
  - Test: leaves old room before joining new room
  - Test: event callbacks are invoked correctly
  - Use React Testing Library `renderHook`
  - Purpose: Verify hook lifecycle and event wiring
  - _Requirements: PE-R1, PE-R6_
  - _Leverage: Vitest, React Testing Library, mock socketService_

---

## Phase 4: Frontend UI Components (Modal, Status Bar, Grid Integration)

### 4.1 Conflict Resolution Modal

- [ ] 35. Create ConflictModal component structure and layout
  - **File:** `frontend/src/components/modals/ConflictModal.tsx` (new)
  - Define `ConflictField` interface: `{ fieldName, fieldKey, baseValue, theirValue, yourValue }`
  - Define `ConflictModalProps` interface: `{ isOpen, patientName, changedBy, conflicts, onKeepMine, onKeepTheirs, onCancel }`
  - Implement modal overlay and card following ConfirmModal pattern (fixed inset-0, centered card, backdrop click to cancel)
  - Render modal header with AlertTriangle icon and "Edit Conflict" title
  - Show patient name and "Changed by [userName]" context
  - Purpose: Create conflict resolution dialog UI shell
  - _Requirements: PE-R5-AC1_
  - _Leverage: `frontend/src/components/modals/ConfirmModal.tsx` (modal structure pattern), Tailwind CSS_

- [ ] 36. Add conflict field comparison display to ConflictModal
  - **File:** `frontend/src/components/modals/ConflictModal.tsx` (continue from task 35)
  - For each conflict in `conflicts` array, render a comparison section:
    - Field name (human-readable header)
    - Three columns: "Original", "Their Version ([changedBy])", "Your Version"
    - Display each value with appropriate formatting (null → "(empty)")
  - Use Tailwind grid layout for three-column comparison
  - Purpose: Show side-by-side comparison of conflicting values
  - _Requirements: PE-R5-AC1_
  - _Leverage: Tailwind CSS grid utilities_

- [ ] 37. Add action buttons to ConflictModal
  - **File:** `frontend/src/components/modals/ConflictModal.tsx` (continue from task 36)
  - Render three buttons in button row:
    - "Keep Theirs" (gray button, calls `onKeepTheirs`)
    - "Keep Mine" (blue button, calls `onKeepMine`)
    - "Cancel" (gray button, calls `onCancel`)
  - Follow ConfirmModal button styling pattern
  - Purpose: Provide user action choices for conflict resolution
  - _Requirements: PE-R5-AC2_
  - _Leverage: ConfirmModal button styles, Tailwind CSS_

### 4.2 Status Bar Connection and Presence Indicators

- [ ] 38. Add connection status indicator to StatusBar
  - **File:** `frontend/src/components/layout/StatusBar.tsx` (modify)
  - Import `useRealtimeStore` to access `connectionStatus`
  - Replace hardcoded "Connected" text (line 17) with dynamic status:
    - `connected`: green dot + "Connected"
    - `reconnecting`: yellow dot + "Reconnecting..."
    - `disconnected`: red dot + "Disconnected"
    - `offline`: gray dot + "Offline mode"
    - `connecting`: no indicator (brief transitional state)
  - Use Tailwind CSS for colored dots (e.g., `w-2 h-2 rounded-full bg-green-500`)
  - Purpose: Show real-time connection status at a glance
  - _Requirements: PE-R7-AC1, PE-R7-AC2, PE-R7-AC3, PE-R7-AC4, PE-R7-AC5_
  - _Leverage: `frontend/src/stores/realtimeStore.ts`, Tailwind CSS_

- [ ] 39. Add presence indicator to StatusBar
  - **File:** `frontend/src/components/layout/StatusBar.tsx` (continue from task 38)
  - Import `useRealtimeStore` to access `roomUsers`
  - If `roomUsers.length > 0`, display count: "2 others online"
  - Add hover tooltip showing list of user display names
  - Use `lucide-react` Users icon
  - Only show when at least one other user is in the room
  - Purpose: Show who else is viewing the same data
  - _Requirements: PE-R2-AC1, PE-R2-AC2, PE-R2-AC4, PE-R2-AC5_
  - _Leverage: `lucide-react`, Tailwind tooltip pattern_

### 4.3 Frontend UI Component Testing

- [ ] 40. Create unit tests for ConflictModal
  - **File:** `frontend/src/components/modals/ConflictModal.test.tsx` (new)
  - Test: renders with conflict data
  - Test: displays patient name and changedBy
  - Test: shows all three value columns (base, theirs, yours)
  - Test: "Keep Mine" button triggers `onKeepMine` callback
  - Test: "Keep Theirs" button triggers `onKeepTheirs` callback
  - Test: "Cancel" button triggers `onCancel` callback
  - Test: backdrop click triggers `onCancel`
  - Test: handles multiple conflicting fields
  - Use Vitest + React Testing Library
  - Purpose: Verify modal UI behavior
  - _Requirements: PE-R5_
  - _Leverage: Vitest, React Testing Library, existing modal test patterns_

- [ ] 41. Update StatusBar unit tests for connection and presence indicators
  - **File:** `frontend/src/components/layout/StatusBar.test.tsx` (modify)
  - Test: renders green "Connected" when connectionStatus is 'connected'
  - Test: renders yellow "Reconnecting..." when connectionStatus is 'reconnecting'
  - Test: renders red "Disconnected" when connectionStatus is 'disconnected'
  - Test: renders gray "Offline mode" when connectionStatus is 'offline'
  - Test: shows presence indicator when roomUsers.length > 0
  - Test: hides presence indicator when roomUsers is empty
  - Test: presence tooltip shows user display names
  - Mock `useRealtimeStore` for testing
  - Purpose: Verify dynamic status bar updates
  - _Requirements: PE-R2, PE-R7_
  - _Leverage: Existing StatusBar tests, Vitest mocks_

---

## Phase 5: Frontend Grid Integration (PatientGrid + MainPage)

### 5.1 PatientGrid Version Tracking and Conflict Handling

- [ ] 42a. Promote updatedAt to required field in GridRow type
  - **File:** `frontend/src/types/index.ts` (modify)
  - Change `updatedAt?: string` to `updatedAt: string` in `GridRow` interface
  - Purpose: Ensure updatedAt is always present for version tracking
  - _Requirements: PE-R4-AC1_
  - _Leverage: Existing `GridRow` interface in `frontend/src/types/index.ts`_

- [ ] 42. Add updatedAt version tracking to PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (modify)
  - Ensure `GridRow` interface includes `updatedAt: string` (verify in `frontend/src/types/index.ts`)
  - In `onCellValueChanged` handler, capture the current row's `updatedAt` as `expectedVersion` before making PUT request
  - Include `expectedVersion` in PUT request body: `{ ...cellData, expectedVersion: row.updatedAt }`
  - Purpose: Track row version for optimistic concurrency control
  - _Requirements: PE-R4-AC1_
  - _Leverage: Existing `onCellValueChanged` handler in PatientGrid.tsx, `frontend/src/types/index.ts`_

- [ ] 43. Add 409 Conflict and 404 Not Found response handling to PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 42)
  - In PUT request error handler, check if `error.response.status === 409`
  - Extract conflict data from response body: `serverRow`, `conflictFields`, `changedBy`
  - Open ConflictModal with conflict data
  - Implement `onKeepMine` callback: retry PUT with `{ ...cellData, forceOverwrite: true }`
  - Implement `onKeepTheirs` callback: revert cell to `serverRow` value using AG Grid API `node.setData(serverRow)`
  - Implement `onCancel` callback: same as "Keep Theirs"
  - Handle 404 error (row deleted while user was editing): show toast notification "Row deleted by another user", remove row from grid
  - Purpose: Handle version conflicts and deleted rows gracefully with user feedback
  - _Requirements: PE-R4-AC4, PE-R4-AC5, PE-R5-AC3, PE-R5-AC4, EC-10_
  - _Leverage: ConflictModal component, AG Grid `node.setData()` API, toast notification utility_

- [ ] 44a. Add toast notification utility to frontend
  - **File:** `frontend/src/utils/toast.ts` (new) OR integrate `react-hot-toast` dependency
  - Option 1: Install `react-hot-toast` and configure provider in `App.tsx`
  - Option 2: Create simple toast component with `useState` and portal
  - Export `showToast(message, type)` function for use in components
  - Purpose: Provide user feedback for cascading edit conflicts and deleted rows
  - _Requirements: PE-R9-AC1, PE-R9-AC2_
  - _Leverage: `react-hot-toast` or custom React portal pattern_

- [ ] 44. Add state for ConflictModal visibility and data in PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 43)
  - Add `useState` for `conflictModalOpen`, `conflictData`, `conflictPatientName`, `conflictChangedBy`
  - Set state when 409 is received, clear state when modal is closed
  - Render `<ConflictModal isOpen={conflictModalOpen} ... />` in the component JSX
  - Purpose: Manage conflict modal state within PatientGrid
  - _Requirements: PE-R5_
  - _Leverage: React `useState`, ConflictModal component_

### 5.2 PatientGrid Cascading Edit Conflict Handling (PE-R9)

- [ ] 44b. Add cascading edit conflict detection to PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 44)
  - In `handleRemoteRowUpdate`, check if the updated row is currently being edited by the user
  - Use AG Grid API `gridRef.current.api.getEditingCells()` to get list of currently editing cells
  - If incoming `row:updated` event affects a cell the user is editing, cancel the edit
  - Call `gridRef.current.api.stopEditing(true)` to cancel (true = cancel, don't save)
  - Show toast notification: "Row updated by [changedBy] — your edit was cancelled because the row changed"
  - Update the row with incoming data using `node.setData(row)`
  - Purpose: Handle cascading edit conflicts gracefully
  - _Requirements: PE-R9-AC1, PE-R9-AC2_
  - _Leverage: AG Grid API (`getEditingCells`, `stopEditing`), toast utility_

- [ ] 44c. Create unit tests for cascading edit conflict handling
  - **File:** `frontend/src/components/grid/PatientGrid.test.tsx` (continue)
  - Test: Remote row update while user is editing the same row cancels user's edit
  - Test: Toast notification is shown with correct message
  - Test: Row is updated with incoming data after edit is cancelled
  - Test: Remote row update on different row does NOT cancel current edit
  - Mock AG Grid `getEditingCells` and `stopEditing` APIs
  - Purpose: Verify cascading conflict handling logic
  - _Requirements: PE-R9_
  - _Leverage: Vitest, AG Grid API mocks, toast utility mock_

### 5.2 PatientGrid Remote Update Handling

- [ ] 45. Add remote row update handler to PatientGrid with out-of-order protection
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 44)
  - Define `handleRemoteRowUpdate(row: GridRow, changedBy: string)` function
  - Use AG Grid API `gridRef.current.api.forEachNode()` to find the node by row ID
  - Compare incoming `row.updatedAt` with local row's `updatedAt` — discard if incoming is older (EC-10)
  - If found and timestamp is newer, call `node.setData(row)` to update row in place
  - If the row is NOT currently being edited, call AG Grid's `flashCells([{ rowNode: node, columns: changedColumns }])` API to animate the changed cells
  - If `isDuplicate` changed, trigger duplicate flag refresh for sibling rows (PE-R8-AC6)
  - Purpose: Apply real-time updates from other users to the grid with staleness protection
  - _Requirements: PE-R1-AC2, PE-R1-AC3, PE-R8-AC6, PE-NFR-P4, EC-10_
  - _Leverage: AG Grid API (`forEachNode`, `setData`, `flashCells`)_

- [ ] 46. Add remote row create and delete handlers to PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 45)
  - Define `handleRemoteRowCreate(row: GridRow)` function: use AG Grid's `applyTransaction({ add: [row] })` to insert the row at correct position based on `rowOrder`
  - Define `handleRemoteRowDelete(rowId: number)` function: use AG Grid's `applyTransaction({ remove: [rowNode] })` to remove the row
  - If the deleted row was selected, clear the selection using `gridRef.current.api.deselectAll()`
  - Purpose: Add and remove rows from the grid when other users create or delete rows
  - _Requirements: PE-R1-AC4, PE-R1-AC5_
  - _Leverage: AG Grid transaction API (`applyTransaction`)_

- [ ] 47. Add full data refresh handler to PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 46)
  - Define `handleDataRefresh()` function to call the existing `fetchPatientData()` function (or equivalent)
  - This re-fetches all data from GET /api/data and replaces the grid's `rowData`
  - Purpose: Re-sync grid data after bulk import or reconnection
  - _Requirements: PE-R6-AC5, PE-R8-AC7, PE-R10-AC4_
  - _Leverage: Existing data fetch logic in PatientGrid or MainPage_

### 5.3 PatientGrid Active Edit Indicators

- [ ] 48. Add active edit indicator CSS classes
  - **File:** `frontend/src/index.css` (modify)
  - Define CSS class `.cell-remote-editing` with `border: 2px dashed #f97316 !important;` (Tailwind orange-500)
  - Define CSS animation `@keyframes cellFlash` for cell update flash (yellow-100 background fade over 1s)
  - Define class `.cell-remote-updated` with the flash animation
  - Purpose: Style cells being edited by other users and cells that were remotely updated
  - _Requirements: PE-R3-AC2, PE-R1-AC3, PE-NFR-U2, PE-NFR-U3_
  - _Leverage: Tailwind CSS colors, CSS animations_

- [ ] 49. Add cellClass callback to AG Grid column definitions in PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 47)
  - Import `useRealtimeStore` to access `activeEdits`
  - In column definitions (or default column def), add `cellClass` callback:
    - Check if `activeEdits` array contains an edit matching `{ rowId: params.node.data.id, field: params.colDef.field }`
    - If match found, return `'cell-remote-editing'`
  - Add `cellRendererParams` with dynamic `title` attribute: "Being edited by [userName]"
  - Purpose: Show dashed orange border on cells being edited by other users
  - _Requirements: PE-R3-AC2, PE-R3-AC3_
  - _Leverage: AG Grid `cellClass` API, `frontend/src/stores/realtimeStore.ts`_

- [ ] 50. Emit editing:start and editing:stop events from PatientGrid
  - **File:** `frontend/src/components/grid/PatientGrid.tsx` (continue from task 49)
  - In `onCellEditingStarted` AG Grid event handler, call `socketService.emitEditingStart(row.id, colDef.field)`
  - In `onCellEditingStopped` AG Grid event handler, call `socketService.emitEditingStop(row.id, colDef.field)`
  - Purpose: Broadcast when the current user starts/stops editing a cell
  - _Requirements: PE-R3-AC1, PE-R3-AC4_
  - _Leverage: AG Grid `onCellEditingStarted` and `onCellEditingStopped` callbacks, `frontend/src/services/socketService.ts`_

### 5.4 MainPage Socket Integration

- [ ] 51. Integrate useSocket hook in MainPage
  - **File:** `frontend/src/pages/MainPage.tsx` (modify)
  - Import `useSocket` from `frontend/src/hooks/useSocket.ts`
  - Call `useSocket({ onRowUpdated, onRowCreated, onRowDeleted, onDataRefresh })` with callbacks that invoke the corresponding PatientGrid handlers
  - Pass the handlers as props to PatientGrid or define them in MainPage and pass via ref/callback
  - Purpose: Connect Socket.IO lifecycle to MainPage component lifecycle
  - _Requirements: PE-R1, PE-R6_
  - _Leverage: `frontend/src/hooks/useSocket.ts`, existing MainPage structure_

- [ ] 52. Add import banner to MainPage for import:started state
  - **File:** `frontend/src/pages/MainPage.tsx` (continue from task 51)
  - Import `useRealtimeStore` to access `importInProgress` and `importedBy`
  - If `importInProgress` is true, render a yellow banner above the grid: "Data import in progress by [importedBy]. Your view will refresh automatically when complete."
  - Use Tailwind CSS for banner styling (e.g., `bg-yellow-100 border-l-4 border-yellow-500 p-4`)
  - Banner should be non-blocking (does not prevent editing)
  - Purpose: Inform users that a bulk import is in progress
  - _Requirements: PE-R10-AC3_
  - _Leverage: Tailwind CSS, `frontend/src/stores/realtimeStore.ts`_

### 5.5 Frontend Grid Integration Testing

- [ ] 53. Update PatientGrid unit tests for version tracking and conflict handling
  - **File:** `frontend/src/components/grid/PatientGrid.test.tsx` (modify)
  - Test: `onCellValueChanged` includes `expectedVersion` in PUT request
  - Test: 409 response opens ConflictModal
  - Test: "Keep Mine" retries PUT with `forceOverwrite: true`
  - Test: "Keep Theirs" reverts cell to server value
  - Mock axios PUT responses (200 OK and 409 Conflict)
  - Purpose: Verify conflict handling logic in PatientGrid
  - _Requirements: PE-R4, PE-R5_
  - _Leverage: Vitest, React Testing Library, axios mocks_

- [ ] 54. Update PatientGrid unit tests for remote update handling
  - **File:** `frontend/src/components/grid/PatientGrid.test.tsx` (continue from task 53)
  - Test: `handleRemoteRowUpdate` updates row data in grid
  - Test: `handleRemoteRowCreate` adds new row to grid
  - Test: `handleRemoteRowDelete` removes row from grid
  - Test: `handleDataRefresh` triggers full data fetch
  - Mock AG Grid API (`applyTransaction`, `setData`, `flashCells`)
  - Purpose: Verify real-time sync logic in PatientGrid
  - _Requirements: PE-R1_
  - _Leverage: Vitest, AG Grid API mocks_

- [ ] 55. Update MainPage unit tests for Socket integration
  - **File:** `frontend/src/pages/MainPage.test.tsx` (modify)
  - Test: `useSocket` hook is called on mount
  - Test: import banner appears when `importInProgress` is true
  - Test: import banner hides when `importInProgress` is false
  - Mock `useSocket` and `useRealtimeStore`
  - Purpose: Verify Socket.IO integration in MainPage
  - _Requirements: PE-R1, PE-R10_
  - _Leverage: Vitest, React Testing Library, hook mocks_

---

## Phase 6: End-to-End Testing (Playwright + Cypress + Visual Review)

### 6.1 Playwright E2E Tests (Layer 3)

- [ ] 56. Create Playwright E2E test for connection status and presence
  - **File:** `frontend/e2e/parallel-editing-connection.spec.ts` (new)
  - Test: Connection status indicator shows "Connected" on page load (green dot)
  - Test: Presence indicator appears when a second user joins (use two browser contexts)
  - Test: Presence tooltip shows other user's display name on hover
  - Test: Presence indicator updates when second user leaves
  - Use Playwright's multi-context feature to simulate two users
  - Purpose: Verify connection and presence UI in real browser
  - _Requirements: PE-R2, PE-R7_
  - _Leverage: Playwright multi-context API, existing Page Object Model from `frontend/e2e/pages/main-page.ts`_

- [ ] 57. Create Playwright E2E test for conflict resolution
  - **File:** `frontend/e2e/parallel-editing-conflict.spec.ts` (new)
  - Test: Two users edit the same cell → second user sees ConflictModal
  - Test: User clicks "Keep Mine" → conflict dialog closes, cell shows user's value
  - Test: User clicks "Keep Theirs" → conflict dialog closes, cell shows other user's value
  - Test: User clicks "Cancel" → conflict dialog closes, cell reverts
  - Use two browser contexts with different authenticated users
  - Purpose: Verify conflict resolution flow end-to-end
  - _Requirements: PE-R4, PE-R5_
  - _Leverage: Playwright multi-context, existing MainPage Page Object_

- [ ] 58. Create Playwright E2E test for real-time row updates
  - **File:** `frontend/e2e/parallel-editing-updates.spec.ts` (new)
  - Test: User A edits a cell → User B sees the update appear in their grid (no page refresh)
  - Test: User A adds a row → User B sees the new row appear
  - Test: User A deletes a row → User B sees the row disappear
  - Test: Import starts → User B sees import banner → import completes → banner disappears and data refreshes
  - Use two browser contexts
  - Purpose: Verify real-time sync across users
  - _Requirements: PE-R1, PE-R10_
  - _Leverage: Playwright multi-context, wait for grid updates_

- [ ] 59. Create Playwright E2E test for reconnection behavior
  - **File:** `frontend/e2e/parallel-editing-reconnection.spec.ts` (new)
  - Test: Simulate network disconnect (use Playwright's `page.route()` to block Socket.IO) → status shows "Reconnecting..."
  - Test: Reconnection succeeds → status shows "Connected", data refreshes
  - Test: Reconnection fails after max retries → status shows "Disconnected"
  - Purpose: Verify reconnection logic and status updates
  - _Requirements: PE-R6-AC4, PE-R6-AC5, PE-R6-AC6, PE-R6-AC8_
  - _Leverage: Playwright network interception API_

### 6.2 Cypress E2E Tests (Layer 4 - AG Grid Interactions)

- [ ] 60. Create Cypress E2E test for remote row update with cell flash
  - **File:** `frontend/cypress/e2e/parallel-editing-grid-updates.cy.ts` (new)
  - Test: Simulate remote `row:updated` event via Socket.IO mock → verify cell updates in AG Grid
  - Test: Cell flash animation appears on remotely-updated cell (check for CSS class `.cell-remote-updated`)
  - Test: Scroll position does not change after remote update
  - Test: Selected row remains selected after remote update (unless it's the updated row)
  - Mock Socket.IO events using `cy.window()` and direct event emission
  - Purpose: Verify AG Grid behavior on remote updates
  - _Requirements: PE-R1-AC2, PE-R1-AC3, PE-NFR-P4_
  - _Leverage: Cypress custom commands (`cy.waitForAgGrid`), AG Grid cell selectors_

- [ ] 61. Create Cypress E2E test for active edit indicators
  - **File:** `frontend/cypress/e2e/parallel-editing-edit-indicators.cy.ts` (new)
  - Test: Simulate `editing:active` event → verify dashed orange border appears on cell
  - Test: Hover over cell with edit indicator → verify tooltip shows "Being edited by [userName]"
  - Test: Simulate `editing:stop` event → verify border is removed
  - Test: Multiple active edits on different cells in the same row
  - Mock Socket.IO events
  - Purpose: Verify edit indicator styling and behavior in AG Grid
  - _Requirements: PE-R3-AC2, PE-R3-AC3, PE-R3-AC4, PE-R3-AC7_
  - _Leverage: Cypress DOM assertions, AG Grid cell selectors_

- [ ] 62. Create Cypress E2E test for row add/delete via Socket.IO
  - **File:** `frontend/cypress/e2e/parallel-editing-row-operations.cy.ts` (new)
  - Test: Simulate `row:created` event → verify new row appears in AG Grid at correct position (by rowOrder)
  - Test: Simulate `row:deleted` event → verify row is removed from AG Grid
  - Test: Deleted row was selected → verify selection is cleared
  - Mock Socket.IO events
  - Purpose: Verify AG Grid transaction behavior on remote row operations
  - _Requirements: PE-R1-AC4, PE-R1-AC5_
  - _Leverage: Cypress AG Grid row selectors, `cy.getAgGridCell` custom command_

### 6.3 Visual Review (Layer 5 - MCP Playwright - MANDATORY)

- [ ] 63. Visual review of ConflictModal layout and readability
  - **Agent:** ui-ux-reviewer
  - Open ConflictModal with sample conflict data (mock 409 response)
  - Take screenshot of modal
  - Verify three-column comparison is clear and readable
  - Verify button labels are understandable ("Keep Mine", "Keep Theirs", "Cancel")
  - Verify modal is centered and overlays grid correctly
  - Check on different screen sizes (desktop, tablet)
  - Purpose: Ensure conflict dialog is user-friendly and accessible
  - _Requirements: PE-NFR-U1_
  - _Leverage: ui-ux-reviewer agent, real browser via MCP Playwright_

- [ ] 64. Visual review of connection status and presence indicators
  - **Agent:** ui-ux-reviewer
  - Navigate to MainPage
  - Take screenshot of StatusBar with "Connected" status (green dot)
  - Simulate reconnecting state → verify yellow dot and "Reconnecting..." text
  - Simulate disconnected state → verify red dot and "Disconnected" text
  - Hover over presence indicator → verify tooltip appears with user names
  - Purpose: Verify status indicators are visible and correctly colored
  - _Requirements: PE-R2, PE-R7, PE-NFR-U5_
  - _Leverage: ui-ux-reviewer agent, real browser clicks and screenshots_

- [ ] 65. Visual review of active edit indicators and cell flash
  - **Agent:** ui-ux-reviewer
  - Navigate to MainPage with grid loaded
  - Simulate `editing:active` event for a cell → verify dashed orange border appears
  - Verify border is distinct from blue selection border
  - Simulate `row:updated` event → verify yellow flash animation on updated cell
  - Verify flash animation is subtle and does not disrupt workflow
  - Purpose: Verify edit indicators and animations are visually clear
  - _Requirements: PE-R3, PE-NFR-U2, PE-NFR-U3_
  - _Leverage: ui-ux-reviewer agent, real browser visual inspection_

- [ ] 66. Visual review of import banner
  - **Agent:** ui-ux-reviewer
  - Simulate `import:started` event → verify yellow banner appears above grid
  - Take screenshot of banner
  - Verify banner text is clear: "Data import in progress by [name]. Your view will refresh automatically when complete."
  - Verify banner does not block grid or prevent scrolling
  - Simulate `import:completed` event → verify banner disappears
  - Purpose: Verify import notification is visible but non-intrusive
  - _Requirements: PE-R10-AC3, PE-NFR-U5_
  - _Leverage: ui-ux-reviewer agent, real browser screenshots_

---

## Phase 7: Documentation and Cleanup

### 7.1 Update Installation Guides

- [ ] 67a. Update Docker-based installation guides for socket.io-client dependency
  - **Files:** `docs/INSTALLATION_GUIDE.md`, `docs/QUICK_INSTALL.md`, `docs/WINDOWS_SERVER_INSTALL.md`
  - Add note that `socket.io-client` is installed automatically via `npm install` in frontend
  - Document that Socket.IO uses WebSocket (primary) with long-polling fallback
  - Document that Nginx WebSocket proxy configuration already exists (no changes needed for Docker deployment)
  - Purpose: Ensure Docker-based installation guides are accurate after adding real-time features
  - _Requirements: ASM-1, ASM-6_
  - _Leverage: Existing installation guides_

- [ ] 67b. Update Render.com installation guide for socket.io-client dependency
  - **File:** `docs/RENDER_INSTALL.md`
  - Add note that `socket.io-client` is installed automatically via `npm install` in frontend
  - Document that Render.com supports WebSocket natively (no configuration changes needed)
  - Document that Socket.IO will use WebSocket by default on Render
  - Purpose: Ensure Render.com installation guide is accurate after adding real-time features
  - _Requirements: ASM-1, ASM-6_
  - _Leverage: Existing Render.com installation guide_

### 7.2 Update Test Documentation

- [ ] 68. Add parallel-editing tests to test inventory and regression plan
  - **Files:** `.claude/TESTING.md`, `.claude/REGRESSION_TEST_PLAN.md`
  - Add all new test files to test inventory with test counts
  - Add parallel-editing test cases to regression plan (TC-PE-1 through TC-PE-20)
  - Mark test cases as "Automated" and link to test file locations
  - Update total test counts: Backend (Jest), Frontend (Vitest), Playwright, Cypress
  - Purpose: Maintain accurate test documentation
  - _Requirements: All PE requirements_
  - _Leverage: Existing test documentation format_

### 7.3 Update Project Documentation

- [ ] 69. Update CHANGELOG.md for parallel-editing feature
  - **File:** `.claude/CHANGELOG.md`
  - Add entry for parallel-editing feature with date, description, and key changes
  - List new components (7 new files)
  - List modified components (6 modified files)
  - List new Socket.IO events (11 events)
  - Note new dependency (`socket.io-client`)
  - Note: 0 database schema changes (leverages existing `updatedAt`)
  - Purpose: Document what changed as source of truth
  - _Requirements: All_
  - _Leverage: CHANGELOG.md format_

- [ ] 70. Update IMPLEMENTATION_STATUS.md to match CHANGELOG
  - **File:** `.claude/IMPLEMENTATION_STATUS.md`
  - Add parallel-editing feature to implementation status
  - Mark as "Completed" with test counts (Layer 1: X tests, Layer 2: Y tests, Layer 3: Z tests, Layer 4: W tests, Layer 5: visual review)
  - Update feature descriptions to reflect real-time capabilities
  - Cross-reference CHANGELOG.md to ensure consistency
  - Purpose: Reconcile implementation status with CHANGELOG
  - _Requirements: All_
  - _Leverage: CHANGELOG.md (source of truth)_

- [ ] 71. Update TODO.md to remove completed parallel-editing tasks
  - **File:** `.claude/TODO.md`
  - Remove or mark as complete any TODO items related to multi-user editing, real-time sync, or conflict resolution
  - Add any follow-up items discovered during implementation (if any)
  - Purpose: Keep TODO list current
  - _Requirements: All_
  - _Leverage: TODO.md format_

---

## Summary

**Total Tasks:** 80 atomic, executable coding tasks (71 original + 9 validation fixes)

**New Files Created:** 31
- Backend: 9 files (types/socket.ts, services/socketManager.ts, middleware/socketAuth.ts, middleware/socketIdMiddleware.ts, services/versionCheck.ts, 4 test files)
- Frontend: 22 files (types/socket.ts, services/socketService.ts, stores/realtimeStore.ts, hooks/useSocket.ts, utils/toast.ts, components/modals/ConflictModal.tsx, 6 test files, 5 E2E test files, 1 CSS file, 3 visual review tasks, 3 doc updates)

**Files Modified:** 11
- Backend: 4 files (index.ts, data.routes.ts, import.routes.ts, 1 test file)
- Frontend: 7 files (types/index.ts, api/axios.ts, MainPage.tsx, PatientGrid.tsx, StatusBar.tsx, index.css, 2 test files)

**Database Changes:** 0 (leverages existing `updatedAt` field)

**Dependencies Added:** 1 (socket.io-client)

**Test Coverage:**
- Layer 1 (Backend Jest): 13 test tasks
- Layer 2 (Frontend Vitest): 8 test tasks (added cascading edit conflict test)
- Layer 3 (Playwright E2E): 4 test tasks
- Layer 4 (Cypress E2E): 3 test tasks
- Layer 5 (MCP Visual Review): 4 review tasks (MANDATORY for UI changes)

**Dependency Chain Overview:**
1. Phase 1 (Tasks 1-13): Backend infrastructure — zero dependencies, can start immediately
2. Phase 2 (Tasks 14-22): Backend API integration — depends on Phase 1 (socketManager, versionCheck)
3. Phase 3 (Tasks 23-34): Frontend infrastructure — depends on socket.io-client install, zero backend dependencies
4. Phase 4 (Tasks 35-41): Frontend UI components — depends on Phase 3 (stores, service)
5. Phase 5 (Tasks 42-55): Frontend grid integration — depends on Phase 3 & 4 (ConflictModal, useSocket)
6. Phase 6 (Tasks 56-66): E2E and visual testing — depends on Phases 1-5 (full implementation)
7. Phase 7 (Tasks 67-71): Documentation — depends on Phase 6 (test counts known)

**Estimated Implementation Phases:**
- Phase 1-2 (Backend): 2-3 days (24 tasks × 20 min avg, includes security and middleware tasks)
- Phase 3-4 (Frontend infra + UI): 2-3 days (19 tasks × 20 min avg, includes socket types and toast utility)
- Phase 5 (Grid integration): 2-3 days (17 tasks × 25 min avg, includes cascading conflict handling)
- Phase 6 (Testing): 2-3 days (11 tasks × 30 min avg)
- Phase 7 (Docs): 0.5 days (6 tasks × 15 min avg, split installation guide updates)
- **Total:** 9-13 days for experienced developer

**Key Reuse Points:**
- Socket.IO server attaches to existing `createServer(app)` in index.ts (line 16)
- JWT auth reuses `verifyToken` and `findUserById` from authService
- Socket ID middleware follows existing Express middleware patterns from `backend/src/middleware/auth.ts`
- ConflictModal follows ConfirmModal structure pattern
- StatusBar extends existing component (line 17 replacement)
- PatientGrid leverages existing AG Grid API (`setData`, `applyTransaction`, `flashCells`, `getEditingCells`, `stopEditing`)
- Toast utility leverages `react-hot-toast` or custom React portal pattern
- MainPage integrates via existing component structure
- All Zustand stores follow authStore pattern
- All test files follow existing test patterns
- Frontend socket types mirror backend socket types for consistency
