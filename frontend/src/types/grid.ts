/**
 * Grid-related payload and status types.
 *
 * MeasureUpdatePayload: fields sent when updating a patient measure row.
 * UserUpdatePayload / UserCreatePayload: admin user management payloads.
 * SaveStatus: save indicator state machine.
 */

import type { UserRole } from '../stores/authStore';

// --- Measure Update Payload ---

/** Fields that can be sent when updating a patient measure row via PUT /api/data/:id */
export interface MeasureUpdatePayload {
  requestType?: string | null;
  qualityMeasure?: string | null;
  measureStatus?: string | null;
  statusDate?: string | null;
  tracking1?: string | null;
  tracking2?: string | null;
  dueDate?: string | null;
  timeIntervalDays?: number | null;
  notes?: string | null;
  memberName?: string;
  memberDob?: string;
  memberTelephone?: string | null;
  memberAddress?: string | null;
  hgba1cGoal?: string | null;
  hgba1cGoalReachedYear?: boolean;
  hgba1cDeclined?: boolean;
  expectedVersion?: string;
  forceOverwrite?: boolean;
}

// --- User Management Payloads ---

/** Fields sent when updating an existing user via PUT /api/admin/users/:id */
export interface UserUpdatePayload {
  email?: string;
  displayName?: string;
  roles?: UserRole[];
  isActive?: boolean;
}

/** Fields sent when creating a new user via POST /api/admin/users */
export interface UserCreatePayload extends UserUpdatePayload {
  email: string;
  password: string;
  displayName: string;
  roles: UserRole[];
}

// --- Save Status ---

/** Save indicator state for the toolbar status indicator. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
