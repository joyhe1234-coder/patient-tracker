# Feature: Parallel Editing (Real-Time Collaborative Editing with Conflict Resolution)

## Introduction

Multiple users can be logged in simultaneously and may edit the same patient data at the same time. Currently, each cell edit triggers a PUT request to the backend, and the last save silently overwrites any unseen changes made by another user. There is no mechanism to notify users of concurrent edits or detect conflicts. This feature introduces real-time collaborative editing where all connected users see each other's changes as they happen, conflicts are detected at save time using optimistic concurrency control, and conflicts are surfaced to the user for resolution rather than silently overwritten. No data entered by any user is lost.

Socket.IO is already a backend dependency (`socket.io@^4.7.5`) but is not wired up. The backend already creates an HTTP server via `createServer(app)` in `index.ts`, which is the standard attachment point for Socket.IO. The `EditLock` model exists in the Prisma schema but single-editor locking was rejected as a design approach in favor of concurrent editing with conflict detection.

## Alignment with Product Vision

The product vision states the system "replaces Excel-based workflows" and identifies the Excel limitation of not supporting "multi-user access." The current system allows multiple logins but does not handle concurrent editing gracefully -- the last save silently wins, which can cause data loss identical to what happens when two people edit the same Excel file on a shared drive. This feature fulfills the product's core promise of true multi-user access by making concurrent editing safe, transparent, and user-friendly. It directly supports the success metric of "Support multiple physicians with patient isolation" by ensuring that even within a single physician's patient set, multiple staff members can safely edit simultaneously.

## Requirements

> **Note:** This feature applies to all authenticated user roles (ADMIN, PHYSICIAN, STAFF). User stories use "user" to refer to any authenticated user. The term "room" refers to a Socket.IO room scoped to a physician's patient dataset (or "unassigned" patients), matching the existing data isolation model.

---

### Requirement 1: Real-Time Data Synchronization

**ID:** PE-R1

**User Story:** As a user, I want to see other users' saved changes appear in my grid in real time without refreshing the page, so that I am always looking at current data.

#### Acceptance Criteria

- PE-R1-AC1: WHEN another user successfully saves a cell edit (PUT /api/data/:id returns success), THEN the system SHALL broadcast the updated row data to all other connected users viewing the same physician's patients within 500ms.
- PE-R1-AC2: WHEN a broadcast update is received for a row visible in the current user's grid, THEN the grid SHALL update that row's data in place without changing the user's scroll position, selected row, or active filters.
- PE-R1-AC3: WHEN a broadcast update is received for a row that the current user is NOT actively editing, THEN the cell values SHALL update silently with a brief visual flash (e.g., 1-second background highlight) to draw attention to the change.
- PE-R1-AC4: WHEN another user adds a new row (POST /api/data), THEN the new row SHALL appear in all other connected users' grids at the correct position (respecting rowOrder).
- PE-R1-AC5: WHEN another user deletes a row (DELETE /api/data/:id), THEN the row SHALL be removed from all other connected users' grids. IF the deleted row was selected by another user, THEN that user's selection SHALL be cleared.
- PE-R1-AC6: WHEN another user duplicates a row (POST /api/data/duplicate), THEN the duplicated row SHALL appear in all other connected users' grids at the correct position.
- PE-R1-AC7: WHEN a user connects to the patient grid page, THEN the system SHALL join a Socket.IO room scoped to the physician whose patients they are viewing (identified by `physicianId` or "unassigned").
- PE-R1-AC8: WHEN a user switches physicians (STAFF/ADMIN selecting a different physician in the header dropdown), THEN the system SHALL leave the previous room and join the new room.
- PE-R1-AC9: WHEN a user navigates away from the patient grid page or logs out, THEN the system SHALL disconnect from the Socket.IO room and stop receiving updates.

---

### Requirement 2: Presence Awareness

**ID:** PE-R2

**User Story:** As a user, I want to see which other users are currently viewing the same patient data, so that I know when my edits might overlap with someone else's work.

#### Acceptance Criteria

- PE-R2-AC1: WHEN one or more other users are connected to the same physician room, THEN the status bar SHALL display a presence indicator showing the count of other connected users (e.g., "2 others online").
- PE-R2-AC2: WHEN the user hovers over the presence indicator, THEN a tooltip SHALL display the display names of all other connected users in the same room.
- PE-R2-AC3: WHEN a user joins or leaves the room, THEN the presence indicator SHALL update within 2 seconds for all other users in the room.
- PE-R2-AC4: WHEN the current user is the only person in the room, THEN no presence indicator SHALL be displayed (or it SHALL display "Connected" with no user count).
- PE-R2-AC5: WHEN displaying presence information, THEN the system SHALL use the user's `displayName` from their authentication profile, not their email address.

---

### Requirement 3: Active Edit Indicators

**ID:** PE-R3

**User Story:** As a user, I want to see which cells other users are currently editing, so that I can avoid editing the same cell and prevent conflicts.

#### Acceptance Criteria

- PE-R3-AC1: WHEN another user begins editing a cell (enters edit mode by double-clicking), THEN the system SHALL broadcast the cell location (row ID + column field) and the editor's display name to all other users in the same room.
- PE-R3-AC2: WHEN a cell is being edited by another user, THEN that cell SHALL display a colored border (distinct from the blue selection border -- e.g., a dashed orange border) visible to all other users.
- PE-R3-AC3: WHEN a cell is being edited by another user, THEN hovering over that cell SHALL show a tooltip with the editor's display name (e.g., "Being edited by Dr. Smith").
- PE-R3-AC4: WHEN another user finishes editing a cell (exits edit mode), THEN the colored border indicator SHALL be removed from all other users' views within 1 second.
- PE-R3-AC5: WHEN another user is editing a cell, THEN other users SHALL still be able to double-click and enter edit mode on that same cell (editing is not blocked, only indicated). The conflict resolution mechanism (PE-R4) handles the case where both users save.
- PE-R3-AC6: WHEN another user disconnects unexpectedly (network loss, browser close), THEN all their active edit indicators SHALL be removed within 5 seconds (based on Socket.IO disconnect detection).
- PE-R3-AC7: WHEN multiple other users are editing different cells in the same row, THEN each cell SHALL show its own edit indicator independently.

---

### Requirement 4: Optimistic Concurrency Control (Conflict Detection)

**ID:** PE-R4

**User Story:** As a user, I want the system to detect when my save would overwrite another user's recent change to the same record, so that I can decide how to proceed rather than unknowingly losing their data.

#### Acceptance Criteria

- PE-R4-AC1: WHEN the frontend sends a PUT /api/data/:id request, THEN the request SHALL include an `expectedVersion` field containing the `updatedAt` timestamp of the row as it was when the user started editing.
- PE-R4-AC2: WHEN the backend receives a PUT /api/data/:id request, THEN it SHALL compare the `expectedVersion` against the current `updatedAt` value of the record in the database.
- PE-R4-AC3: IF the `expectedVersion` matches the current `updatedAt`, THEN the update SHALL proceed normally (no conflict).
- PE-R4-AC4: IF the `expectedVersion` does NOT match the current `updatedAt` (indicating another user saved between when this user loaded the data and when they are saving), THEN the backend SHALL return a 409 Conflict response containing:
  - The current server-side row data (the "theirs" version)
  - The field(s) that were changed by the other user since the `expectedVersion`
  - The identity (display name) of the user who made the conflicting change (if available from audit log)
- PE-R4-AC5: WHEN a 409 Conflict response is received, THEN the frontend SHALL NOT silently overwrite the data. Instead, it SHALL present a conflict resolution dialog to the user (see PE-R5).
- PE-R4-AC6: WHEN the user has not edited any field that conflicts with the other user's change (e.g., User A edited `notes` and User B edited `measureStatus` on the same row), THEN the system SHALL auto-merge the changes without showing a conflict dialog: the backend SHALL accept the update because the specific fields do not overlap.
- PE-R4-AC7: WHEN computing whether a conflict exists, THEN the system SHALL compare at the field level, not the row level. Two users editing different fields of the same row in the same time window SHALL NOT trigger a conflict.

---

### Requirement 5: Conflict Resolution Dialog

**ID:** PE-R5

**User Story:** As a user, when my save conflicts with another user's change to the same field, I want to see both versions side-by-side and choose which to keep (or combine them), so that no data is lost.

#### Acceptance Criteria

- PE-R5-AC1: WHEN a field-level conflict is detected (same field edited by two users), THEN the system SHALL display a modal dialog titled "Edit Conflict" with the following information:
  - The field name (human-readable column header, e.g., "Measure Status")
  - The patient name and row context
  - "Their version" (the value saved by the other user, with the other user's display name)
  - "Your version" (the value the current user attempted to save)
  - The original value before either user edited (the "base" version)
- PE-R5-AC2: WHEN the conflict dialog is displayed, THEN the user SHALL have three action buttons:
  - "Keep Theirs" -- accept the other user's value and discard the current user's change
  - "Keep Mine" -- overwrite the other user's value with the current user's value (force save)
  - "Cancel" -- abandon the current user's change and revert the cell to the other user's value (functionally equivalent to "Keep Theirs" but semantically different intent)
- PE-R5-AC3: WHEN the user clicks "Keep Mine", THEN the system SHALL send a force-save request with a flag (e.g., `forceOverwrite: true`) that bypasses the version check, and the save SHALL succeed.
- PE-R5-AC4: WHEN the user clicks "Keep Theirs" or "Cancel", THEN the current user's cell SHALL revert to the other user's saved value (the server's current value), and no additional API call SHALL be made.
- PE-R5-AC5: WHEN the conflict dialog is displayed, THEN the user's grid SHALL remain in its current state (no other edits should be blocked). The dialog is specific to the one conflicting cell.
- PE-R5-AC6: WHEN multiple fields on the same row conflict simultaneously (e.g., due to a cascading update), THEN the conflict dialog SHALL show all conflicting fields together in a single dialog, with "Keep Theirs" / "Keep Mine" applying to all fields at once.

---

### Requirement 6: Socket.IO Connection Lifecycle

**ID:** PE-R6

**User Story:** As a user, I want the real-time connection to be reliable and recover gracefully from network interruptions, so that I do not miss updates or get into an inconsistent state.

#### Acceptance Criteria

- PE-R6-AC1: WHEN the user's browser loads the patient grid page, THEN the frontend SHALL establish a Socket.IO connection to the backend, authenticating with the user's JWT token.
- PE-R6-AC2: WHEN the Socket.IO connection is established, THEN the backend SHALL verify the JWT token and associate the socket with the authenticated user.
- PE-R6-AC3: IF the JWT token is invalid or expired, THEN the Socket.IO connection SHALL be rejected, and the frontend SHALL fall back to non-real-time mode (standard HTTP-only behavior, identical to current functionality).
- PE-R6-AC4: WHEN the Socket.IO connection drops (network interruption), THEN the frontend SHALL automatically attempt to reconnect using Socket.IO's built-in reconnection mechanism (exponential backoff, max 10 attempts).
- PE-R6-AC5: WHEN reconnection succeeds after a disconnect, THEN the frontend SHALL re-join the appropriate physician room AND perform a full data refresh (GET /api/data) to catch up on any changes missed during the disconnection.
- PE-R6-AC6: WHEN reconnection fails after all retry attempts, THEN the status bar SHALL display a "Disconnected -- edits will not sync in real time" warning, and the system SHALL continue to function in HTTP-only mode (saves still work, just no real-time updates from others).
- PE-R6-AC7: WHEN the backend restarts (deployment, crash), THEN all connected clients SHALL detect the disconnection and follow the reconnection flow (PE-R6-AC4 through PE-R6-AC6).
- PE-R6-AC8: WHEN Socket.IO is in reconnecting state, THEN the status bar SHALL display "Reconnecting..." to inform the user.

---

### Requirement 7: Connection Status Indicator

**ID:** PE-R7

**User Story:** As a user, I want to see the real-time connection status at a glance, so that I know whether my view is live or potentially stale.

#### Acceptance Criteria

- PE-R7-AC1: WHEN the Socket.IO connection is established and healthy, THEN the status bar SHALL display a green dot indicator with the text "Connected".
- PE-R7-AC2: WHEN the Socket.IO connection is in reconnecting state, THEN the status bar SHALL display a yellow dot indicator with the text "Reconnecting...".
- PE-R7-AC3: WHEN the Socket.IO connection has failed (all retries exhausted), THEN the status bar SHALL display a red dot indicator with the text "Disconnected".
- PE-R7-AC4: WHEN the system is operating in HTTP-only fallback mode (Socket.IO unavailable or token rejected), THEN the status bar SHALL display a gray dot indicator with the text "Offline mode" (or no indicator at all, maintaining current behavior).
- PE-R7-AC5: WHEN the connection status changes, THEN the indicator SHALL update within 1 second.

---

### Requirement 8: Row-Level Update Broadcast

**ID:** PE-R8

**User Story:** As a user, I want row-level changes (add, update, delete) to be broadcast efficiently so that the system remains responsive even with many concurrent users.

#### Acceptance Criteria

- PE-R8-AC1: WHEN a successful PUT /api/data/:id completes, THEN the backend SHALL emit a `row:updated` event to the physician room containing the full updated row data (same format as the API response).
- PE-R8-AC2: WHEN a successful POST /api/data completes (new row), THEN the backend SHALL emit a `row:created` event to the physician room containing the new row data and its position (rowOrder).
- PE-R8-AC3: WHEN a successful DELETE /api/data/:id completes, THEN the backend SHALL emit a `row:deleted` event to the physician room containing the deleted row's ID.
- PE-R8-AC4: WHEN a successful POST /api/data/duplicate completes, THEN the backend SHALL emit a `row:created` event to the physician room containing the new duplicated row data.
- PE-R8-AC5: WHEN broadcasting events, THEN the server SHALL exclude the originating user's socket from the broadcast (the originator already has the updated data from the API response).
- PE-R8-AC6: WHEN a `row:updated` event is received AND the row's `isDuplicate` flag has changed, THEN the frontend SHALL also refresh duplicate flags for other rows belonging to the same patient (by re-fetching or by listening for a batch update event).
- PE-R8-AC7: WHEN a bulk operation occurs (e.g., import execution), THEN the backend SHALL emit a `data:refresh` event indicating that all clients should perform a full data reload rather than receiving individual row events.

---

### Requirement 9: Cascading Edit Conflict Handling

**ID:** PE-R9

**User Story:** As a user, I want cascading field updates (e.g., changing Request Type clears Quality Measure, Measure Status, etc.) to be handled correctly when another user is editing downstream fields, so that the cascade does not silently destroy their in-progress work.

#### Acceptance Criteria

- PE-R9-AC1: WHEN User A changes a parent field (e.g., `requestType`) that triggers a cascade clearing downstream fields, AND User B is currently editing a downstream field (e.g., `measureStatus`) on the same row, THEN User B SHALL receive a notification that the row has been substantially changed by User A.
- PE-R9-AC2: WHEN a cascading update broadcast is received for a row the current user is editing, THEN the system SHALL:
  1. Cancel the current user's in-progress edit (exit edit mode)
  2. Display a toast notification: "Row updated by [User A's name] -- your edit was cancelled because the row changed."
  3. Update the row data to reflect the cascade
- PE-R9-AC3: WHEN a cascade clears multiple fields at once, THEN the broadcast SHALL include all affected fields so the receiving client can update them atomically (not one field at a time).

---

### Requirement 10: Data Integrity During Import

**ID:** PE-R10

**User Story:** As an admin or staff member performing an import, I want other users to be notified that an import is in progress and that data may change, so that they do not unknowingly edit stale data during the import.

#### Acceptance Criteria

- PE-R10-AC1: WHEN an import execution begins (POST /api/import/execute), THEN the backend SHALL emit an `import:started` event to all affected physician rooms.
- PE-R10-AC2: WHEN an import execution completes, THEN the backend SHALL emit an `import:completed` event to all affected physician rooms, triggering a full data refresh on all connected clients.
- PE-R10-AC3: WHEN an `import:started` event is received, THEN the frontend SHALL display a non-blocking banner: "Data import in progress. Your view will refresh automatically when complete."
- PE-R10-AC4: WHEN an `import:completed` event is received, THEN the frontend SHALL perform a full data reload (GET /api/data) and dismiss the import banner.
- PE-R10-AC5: IF a user attempts to edit a cell while an import is in progress, THEN the edit SHALL still be allowed (not blocked), but the user SHALL be warned via the banner that their changes may be affected by the import.

---

### Requirement 11: Audit Trail for Concurrent Edits

**ID:** PE-R11

**User Story:** As an admin, I want the audit log to capture which user made each change and whether it was a normal save or a force-overwrite after a conflict, so that I can investigate any disputes about data.

#### Acceptance Criteria

- PE-R11-AC1: WHEN a cell edit is saved successfully (no conflict), THEN the audit log entry SHALL include the user's ID, email, the entity, entity ID, and the field-level changes (old value, new value).
- PE-R11-AC2: WHEN a force-overwrite save occurs (user chose "Keep Mine" after conflict), THEN the audit log entry SHALL include an additional flag or detail indicating it was a conflict-override, along with the identity of the user whose value was overwritten.
- PE-R11-AC3: WHEN a "Keep Theirs" resolution occurs, THEN no additional audit log entry SHALL be created (since no data change occurred).

---

## Non-Functional Requirements

### Performance

- PE-NFR-P1: Socket.IO event broadcast latency from server emit to client receipt SHALL be under 200ms on a local network and under 500ms over the internet (Render.com deployment).
- PE-NFR-P2: The addition of Socket.IO SHALL NOT increase the initial page load time by more than 50ms (the `socket.io-client` library is approximately 40KB gzipped).
- PE-NFR-P3: The system SHALL support at least 20 concurrent Socket.IO connections per physician room without degradation in broadcast latency.
- PE-NFR-P4: Real-time updates to the AG Grid (row data changes from broadcasts) SHALL complete within 100ms of event receipt, without causing visible grid flicker or scroll position changes.
- PE-NFR-P5: The version check (optimistic concurrency) on the backend SHALL add no more than 10ms to the existing PUT /api/data/:id response time, as it only compares one timestamp field already loaded from the database.

### Security

- PE-NFR-S1: Socket.IO connections SHALL be authenticated using the same JWT token used for HTTP API calls. Unauthenticated sockets SHALL be rejected.
- PE-NFR-S2: Socket.IO events SHALL respect the same role-based access control as HTTP endpoints: users SHALL only receive events for physician rooms they are authorized to access.
- PE-NFR-S3: The JWT token SHALL be validated on Socket.IO connection AND on each room join. If the token expires while connected, the socket SHALL be disconnected on the next event attempt.
- PE-NFR-S4: Socket.IO connections SHALL use the same CORS configuration as the HTTP API.
- PE-NFR-S5: The `forceOverwrite` flag in conflict resolution SHALL be auditable (PE-R11-AC2) to prevent abuse.

### Reliability

- PE-NFR-R1: If the Socket.IO server fails to start or crashes, the application SHALL continue to function in HTTP-only mode (current behavior). Real-time features degrade gracefully, not catastrophically.
- PE-NFR-R2: Socket.IO reconnection SHALL use exponential backoff starting at 1 second, doubling to a maximum of 30 seconds, with a maximum of 10 reconnection attempts before giving up.
- PE-NFR-R3: On reconnection, the client SHALL perform a full data refresh to ensure consistency. Partial state recovery SHALL NOT be attempted (too error-prone).
- PE-NFR-R4: The `expectedVersion` (updatedAt timestamp) SHALL be stored per-row on the frontend. It SHALL be refreshed whenever row data is received (from API response, from Socket.IO broadcast, or from full data refresh).

### Usability

- PE-NFR-U1: The conflict resolution dialog SHALL be understandable by non-technical users. Labels like "Their version" and "Your version" SHALL be used instead of technical terms like "server state" or "optimistic concurrency conflict."
- PE-NFR-U2: The visual flash for remotely-updated cells SHALL be subtle (e.g., a 1-second pale yellow background fade) and SHALL NOT disrupt the user's current workflow.
- PE-NFR-U3: Active edit indicators (dashed orange borders) SHALL be clearly distinct from the existing blue selection border and row status colors.
- PE-NFR-U4: Toast notifications for cancelled edits (PE-R9-AC2) SHALL auto-dismiss after 5 seconds but SHALL remain clickable to dismiss early.
- PE-NFR-U5: The presence indicator and connection status SHALL be unobtrusive -- integrated into the existing status bar, not a separate floating widget.

### Scalability

- PE-NFR-SC1: The system SHALL handle the expected concurrent user load of a medical office (2-10 simultaneous users per physician dataset) without performance degradation.
- PE-NFR-SC2: Socket.IO rooms (per physician) naturally isolate broadcast traffic. A user viewing Physician A's patients SHALL NOT receive events for Physician B's patients.
- PE-NFR-SC3: The system does not need to support hundreds of concurrent connections. The design targets small-to-medium medical offices (up to 50 total users, with no more than 20 viewing the same physician's data simultaneously).

---

## Edge Cases

### EC-1: Two users edit the same cell at the exact same moment
**Scenario:** User A and User B both double-click the `notes` cell of the same row within milliseconds of each other. Both enter edit mode. User A saves first.
**Expected:** User A's save succeeds normally. User B sees the cell update (via broadcast) but continues editing with their own value in the input field. When User B saves, the version check detects a conflict (updatedAt changed). The conflict dialog shows User A's version vs User B's version. User B chooses which to keep.

### EC-2: User saves while disconnected from Socket.IO
**Scenario:** User's Socket.IO connection drops but they continue editing (HTTP is still working). They save a cell.
**Expected:** The PUT request succeeds via HTTP (version check still works). Other users do not receive the broadcast (since Socket.IO is disconnected on this user's side). When the user reconnects, a full data refresh occurs, and other users will see the change at that point. If another user saved to the same field in the meantime, the reconnection refresh will show the latest data.

### EC-3: User B is editing a cell when User A deletes the entire row
**Scenario:** User B is editing the `measureStatus` cell of row #42. User A deletes row #42.
**Expected:** User B receives a `row:deleted` event. The grid removes row #42, which cancels User B's in-progress edit. A toast notification appears: "Row deleted by [User A's name]. Your edit was cancelled." User B's save (if they press Enter/Tab) will fail with a 404 because the row no longer exists. The frontend SHALL handle this gracefully (show a message, not an unhandled error).

### EC-4: Rapid successive edits by the same user
**Scenario:** User quickly edits 5 cells in succession (tab-through editing). Each edit triggers a PUT request and a Socket.IO broadcast.
**Expected:** Each PUT request includes the correct `expectedVersion` for that row at the time the edit began. Since the user's own saves update the local version, subsequent saves should not conflict with themselves. Broadcasts are sent for each save, and other users see each update arrive sequentially.

### EC-5: Cascading edit while another user is mid-edit on a downstream field
**Scenario:** User A is editing `measureStatus` on a row. User B changes `requestType` on the same row, which cascades and clears `qualityMeasure`, `measureStatus`, `statusDate`, `tracking1-3`, `dueDate`, and `timeIntervalDays`.
**Expected:** User A receives a broadcast showing the cascade. User A's edit mode is cancelled, a toast notification explains what happened, and the row updates to show the cascaded (cleared) values. User A can then re-enter edit mode on the now-cleared row.

### EC-6: Socket.IO server unavailable at page load
**Scenario:** The Socket.IO server is down or unreachable when the user loads the patient grid page.
**Expected:** The page loads normally. The grid displays data fetched via HTTP. The status bar shows "Offline mode" (gray dot). All editing works via HTTP as it does today. The frontend periodically attempts to establish a Socket.IO connection in the background. If it succeeds later, the system transitions to real-time mode.

### EC-7: Two users viewing different physicians
**Scenario:** Staff member A views Dr. Smith's patients. Staff member B views Dr. Jones's patients. Both are online.
**Expected:** User A is in room "physician:5" (Dr. Smith's ID). User B is in room "physician:8" (Dr. Jones's ID). They do not see each other's presence indicators or edit indicators. Broadcasts are completely isolated.

### EC-8: Admin switching between physician views
**Scenario:** Admin is viewing Dr. Smith's patients (room "physician:5"). Admin switches to Dr. Jones's patients via the header dropdown.
**Expected:** Admin leaves room "physician:5" and joins room "physician:8". Presence indicators update in both rooms: Admin disappears from Dr. Smith's room users, appears in Dr. Jones's room. Any in-progress edit indicators from the Admin are cleared in the old room.

### EC-9: Conflict on a field that was auto-calculated
**Scenario:** User A changes `statusDate`, which triggers backend auto-calculation of `dueDate` and `timeIntervalDays`. Meanwhile User B also changed `statusDate` on the same row.
**Expected:** The conflict is detected on the `statusDate` field (the explicitly edited field). The conflict dialog shows the `statusDate` values. The auto-calculated fields (`dueDate`, `timeIntervalDays`) are NOT shown in the conflict dialog because they are derived. Whichever version the user picks, the backend recalculates the derived fields.

### EC-10: Network latency causes out-of-order broadcasts
**Scenario:** User A saves field X, then saves field Y on the same row in quick succession. Due to network conditions, User B receives the field Y broadcast before the field X broadcast.
**Expected:** Each broadcast includes the full row data with the `updatedAt` timestamp. The frontend SHALL apply updates only if the incoming `updatedAt` is newer than the locally stored `updatedAt` for that row. If an older broadcast arrives after a newer one, it is discarded.

### EC-11: Import while users are actively editing
**Scenario:** An admin starts a bulk import that affects 200 rows. Three staff members are actively editing different rows.
**Expected:** All three staff members see the "Data import in progress" banner (PE-R10-AC3). Their in-progress edits are NOT cancelled immediately (the import is async). When the import completes, all clients perform a full data refresh. If any of the staff members' rows were modified by the import, those changes are reflected. If a staff member saves during the import and their row was also modified by the import, the version check will catch it.

### EC-12: User opens the same patient grid in two browser tabs
**Scenario:** A user opens the patient grid in two separate browser tabs, both authenticated with the same JWT token.
**Expected:** Both tabs establish separate Socket.IO connections and join the same room. Edits in Tab A broadcast to Tab B and vice versa. Each tab maintains its own `expectedVersion` state. Conflicts between the user's own two tabs are handled the same way as conflicts between two different users.

---

## Assumptions and Constraints

### Assumptions

- ASM-1: Socket.IO will use WebSocket as the primary transport with long-polling as a fallback. The Render.com deployment supports WebSocket connections.
- ASM-2: The `updatedAt` field on `PatientMeasure` (managed by Prisma's `@updatedAt` directive) provides sufficient timestamp resolution for conflict detection. Prisma stores `updatedAt` with millisecond precision.
- ASM-3: The number of concurrent users per physician room will not exceed 20. The system is designed for small-to-medium medical offices.
- ASM-4: The existing `EditLock` model in the Prisma schema will NOT be used for this feature (single-editor locking was rejected). The model may remain in the schema for backward compatibility but will not be actively used.
- ASM-5: The frontend `socket.io-client` library will need to be added as a new dependency to the frontend package.json (it is not currently present).
- ASM-6: Nginx reverse proxy (in Docker deployment) and Render.com both support WebSocket passthrough. Nginx may require configuration updates to proxy WebSocket upgrade requests.
- ASM-7: The `updatedAt` field on the `Patient` model (for patient-level fields like `memberName`, `memberDob`) also serves as a version field for patient-level edits.

### Constraints

- CON-1: The existing data route architecture (PUT /api/data/:id) will be extended, not replaced. The `expectedVersion` field is an additive change to the request body.
- CON-2: The existing AG Grid auto-save behavior (save on cell blur) remains unchanged. Socket.IO provides real-time sync on top of the existing HTTP save mechanism.
- CON-3: No server-side operational transformation (OT) or CRDT is needed. The granularity of edits (one cell at a time, auto-saved immediately) means conflicts are infrequent and can be resolved via simple last-write-wins with user confirmation.
- CON-4: The system does not need offline editing support. If both HTTP and Socket.IO are unavailable, the user cannot save and should be informed.
- CON-5: Socket.IO state (rooms, presence) is in-memory on the server. If the server restarts, all clients reconnect and re-join rooms. No persistent Socket.IO state is required.
- CON-6: The existing Zustand auth store will be extended with Socket.IO connection state, or a new Zustand store will be created for real-time state management.
- CON-7: The existing StatusBar component will be extended to show connection status and presence indicators. The component's props interface will need to be updated.
- CON-8: The conflict resolution dialog will be a new modal component following the existing `ConfirmModal` pattern.

---

## Dependencies

### Depends On (Existing, Completed)

- **Cell Editing** -- PUT /api/data/:id endpoint and frontend auto-save behavior (completed, Phase 2)
- **Authentication** -- JWT tokens, user identity, and role-based access control (completed, Phase 11)
- **Patient Ownership** -- Physician-scoped data isolation and physicianId routing (completed, Phase 12)
- **Row Operations** -- Add, delete, duplicate row endpoints (completed, Phase 3)
- **Import Pipeline** -- Import execution endpoint for import notification events (completed, Phase 5)
- **Audit Logging** -- AuditLog model and logging infrastructure (completed, Phase 11)

### New Dependencies (Must Be Added)

- **socket.io-client** -- Frontend Socket.IO client library (new npm dependency for frontend)
- **Nginx WebSocket config** -- Nginx must be configured to proxy WebSocket upgrade requests to the backend (Docker deployment)

### Blocks

- **Phase 13: Excel-like Behaviors** -- keyboard navigation, copy/paste, undo/redo will need to integrate with the real-time sync system

---

## Integration Points

### Backend Components Affected

| Component | File | Change Type |
|-----------|------|-------------|
| Server entry point | `backend/src/index.ts` | Modify: attach Socket.IO to HTTP server, configure auth middleware for sockets |
| Data routes | `backend/src/routes/data.routes.ts` | Modify: add `expectedVersion` check to PUT, emit Socket.IO events after successful CRUD operations |
| Import routes | `backend/src/routes/import.routes.ts` | Modify: emit import:started/completed events |
| Auth middleware | `backend/src/middleware/auth.ts` | Add: Socket.IO authentication middleware (reuse JWT verification) |
| Socket.IO manager | `backend/src/services/socketManager.ts` | New: manage rooms, presence tracking, event broadcasting |
| Audit logging | `backend/src/routes/data.routes.ts` or new service | Modify: log conflict-override saves with additional metadata |

### Frontend Components Affected

| Component | File | Change Type |
|-----------|------|-------------|
| Socket.IO client | `frontend/src/services/socketService.ts` | New: Socket.IO connection management, event handlers, reconnection logic |
| Real-time store | `frontend/src/stores/realtimeStore.ts` | New: Zustand store for connection status, presence, active edit indicators |
| MainPage | `frontend/src/pages/MainPage.tsx` | Modify: integrate Socket.IO event handlers for row updates, pass version info to grid |
| PatientGrid | `frontend/src/components/grid/PatientGrid.tsx` | Modify: track `expectedVersion` per row, send with PUT requests, handle broadcast updates, show edit indicators |
| StatusBar | `frontend/src/components/layout/StatusBar.tsx` | Modify: display connection status indicator and presence count |
| ConflictModal | `frontend/src/components/modals/ConflictModal.tsx` | New: conflict resolution dialog |
| Axios client | `frontend/src/api/axios.ts` | Modify: include `expectedVersion` in PUT requests (or handled by PatientGrid directly) |

### Existing API Endpoints Modified

| Endpoint | Modification |
|----------|-------------|
| PUT /api/data/:id | Add `expectedVersion` field to request body; return 409 with conflict details if version mismatch; emit Socket.IO event on success |
| POST /api/data | Emit Socket.IO `row:created` event on success |
| DELETE /api/data/:id | Emit Socket.IO `row:deleted` event on success |
| POST /api/data/duplicate | Emit Socket.IO `row:created` event on success |
| POST /api/import/execute | Emit Socket.IO `import:started` before execution and `import:completed` after |

### New Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `row:updated` | Server -> Client | `{ row: GridRow, changedBy: string }` | Row data was updated by another user |
| `row:created` | Server -> Client | `{ row: GridRow, changedBy: string }` | New row was added by another user |
| `row:deleted` | Server -> Client | `{ rowId: number, changedBy: string }` | Row was deleted by another user |
| `data:refresh` | Server -> Client | `{ reason: string }` | Clients should perform full data reload |
| `import:started` | Server -> Client | `{ importedBy: string }` | Bulk import has started |
| `import:completed` | Server -> Client | `{ importedBy: string, stats: object }` | Bulk import has completed |
| `editing:start` | Client -> Server | `{ rowId: number, field: string }` | User started editing a cell |
| `editing:stop` | Client -> Server | `{ rowId: number, field: string }` | User stopped editing a cell |
| `editing:active` | Server -> Client | `{ rowId: number, field: string, userName: string }` | Another user is editing a cell |
| `editing:inactive` | Server -> Client | `{ rowId: number, field: string }` | Another user stopped editing a cell |
| `presence:update` | Server -> Client | `{ users: Array<{ id: number, displayName: string }> }` | Updated list of users in the room |
| `room:join` | Client -> Server | `{ physicianId: number \| 'unassigned' }` | Join a physician's data room |
| `room:leave` | Client -> Server | `{ physicianId: number \| 'unassigned' }` | Leave a physician's data room |

---

## Technical Notes

### Why Optimistic Concurrency Over Locking

Single-editor locking (using the `EditLock` model) was rejected because:
1. It blocks all other users from editing any cell while one user has the lock -- unacceptable in a multi-user office.
2. Lock management is complex (timeouts, stale locks from browser crashes, lock contention).
3. The actual conflict rate in this system is expected to be very low: most edits are to different rows, and even same-row edits are usually to different fields.

Optimistic concurrency is the right choice because:
1. It allows all users to edit freely with zero wait time.
2. Conflicts are rare and are handled gracefully when they occur.
3. The `updatedAt` timestamp is already maintained by Prisma and requires no schema changes.
4. Field-level conflict detection further reduces the conflict rate to near-zero.

### Version Tracking Strategy

Each `GridRow` in the frontend will carry its `updatedAt` timestamp. When the user begins editing a cell, the current `updatedAt` is captured as the `expectedVersion`. When the PUT request is sent, this version is included. The backend compares it against the database record's current `updatedAt`. If they match, no intervening edit occurred and the save proceeds. If they differ, a conflict exists.

### Socket.IO Room Naming Convention

Rooms will be named by the physician ID that scopes the data:
- `physician:{id}` for a specific physician's patients (e.g., `physician:5`)
- `physician:unassigned` for unassigned patients
- This matches the existing `physicianId` query parameter used by GET /api/data

### Graceful Degradation

The entire Socket.IO layer is additive. If Socket.IO is unavailable (server not configured, network blocks WebSocket, etc.), the application behaves exactly as it does today. All CRUD operations continue to work via HTTP. The only difference is that other users' changes are not visible until the page is refreshed.
