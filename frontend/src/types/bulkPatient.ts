// Type definitions for the Bulk Patient Management feature.
// Used by bulkPatientStore, BulkOperationsTab, and bulk operation modals.

// --- Data Types ---

/** A patient record as returned by GET /api/admin/patients. */
export interface BulkPatient {
  id: number;
  memberName: string;
  memberDob: string;           // ISO date string (YYYY-MM-DD)
  memberTelephone: string | null;
  ownerId: number | null;
  ownerName: string | null;    // Physician display name, null if unassigned
  insuranceGroup: string | null;
  measureCount: number;
  latestMeasure: string | null;    // Most recent quality measure label
  latestStatus: string | null;     // Most recent measure status
  updatedAt: string;           // ISO datetime string
}

/** Summary counts returned alongside the patient list. */
export interface PatientSummary {
  totalPatients: number;
  assignedCount: number;
  unassignedCount: number;
  insuranceSystemCount: number;
}

// --- Filter Types ---

/** Active filter values for the Bulk Operations table. */
export interface PatientFilters {
  physician: string;     // '' = all, '__unassigned__' = unassigned, else physician display name
  insurance: string;     // '' = all, else insurance group name
  measure: string;       // '' = all, else quality measure code
  search: string;        // '' = no search, else case-insensitive substring
}

// --- Reference Data Types ---

/** A physician available for bulk assignment. */
export interface Physician {
  id: number;
  displayName: string;
  email: string;
  roles: string[];
}
