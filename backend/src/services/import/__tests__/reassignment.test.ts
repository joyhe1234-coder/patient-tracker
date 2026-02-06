/**
 * Unit tests for PatientReassignment interface and related structures
 *
 * Note: Full integration tests for detectReassignments() are in integration.test.ts
 * These tests focus on the interface contract and data structures
 */

import { describe, it, expect } from '@jest/globals';
import { PatientReassignment } from '../diffCalculator.js';

describe('PatientReassignment interface', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'John Smith',
        memberDob: '1990-01-15',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.patientId).toBe(1);
      expect(reassignment.memberName).toBe('John Smith');
      expect(reassignment.memberDob).toBe('1990-01-15');
      expect(reassignment.currentOwnerId).toBe(5);
      expect(reassignment.currentOwnerName).toBe('Dr. Smith');
      expect(reassignment.newOwnerId).toBe(10);
      expect(reassignment.newOwnerName).toBe('Dr. Jones');
    });

    it('should allow null for currentOwnerId when patient was unassigned', () => {
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'John Smith',
        memberDob: '1990-01-15',
        currentOwnerId: null,
        currentOwnerName: null,
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.currentOwnerId).toBeNull();
      expect(reassignment.currentOwnerName).toBeNull();
    });

    it('should allow null for newOwnerId when importing to unassigned', () => {
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'John Smith',
        memberDob: '1990-01-15',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: null,
        newOwnerName: null,
      };

      expect(reassignment.newOwnerId).toBeNull();
      expect(reassignment.newOwnerName).toBeNull();
    });

    it('should allow all owner fields to be null', () => {
      // Edge case: unassigned → unassigned (shouldn't happen but interface allows)
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'John Smith',
        memberDob: '1990-01-15',
        currentOwnerId: null,
        currentOwnerName: null,
        newOwnerId: null,
        newOwnerName: null,
      };

      expect(reassignment.currentOwnerId).toBeNull();
      expect(reassignment.currentOwnerName).toBeNull();
      expect(reassignment.newOwnerId).toBeNull();
      expect(reassignment.newOwnerName).toBeNull();
    });
  });

  describe('newOwnerName field', () => {
    it('should contain the target physician display name', () => {
      const reassignment: PatientReassignment = {
        patientId: 42,
        memberName: 'Jane Doe',
        memberDob: '1985-05-15',
        currentOwnerId: 1,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 2,
        newOwnerName: 'Dr. Jones',
      };

      // The new field should contain the actual physician name
      expect(reassignment.newOwnerName).toBe('Dr. Jones');
      expect(typeof reassignment.newOwnerName).toBe('string');
    });

    it('should be null when target is unassigned', () => {
      const reassignment: PatientReassignment = {
        patientId: 42,
        memberName: 'Jane Doe',
        memberDob: '1985-05-15',
        currentOwnerId: 1,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: null,
        newOwnerName: null,
      };

      expect(reassignment.newOwnerName).toBeNull();
    });
  });

  describe('currentOwnerName field', () => {
    it('should contain the current physician display name', () => {
      const reassignment: PatientReassignment = {
        patientId: 42,
        memberName: 'Jane Doe',
        memberDob: '1985-05-15',
        currentOwnerId: 1,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 2,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.currentOwnerName).toBe('Dr. Smith');
    });

    it('should be null when patient was unassigned', () => {
      const reassignment: PatientReassignment = {
        patientId: 42,
        memberName: 'Jane Doe',
        memberDob: '1985-05-15',
        currentOwnerId: null,
        currentOwnerName: null,
        newOwnerId: 2,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.currentOwnerName).toBeNull();
    });
  });

  describe('reassignment scenarios', () => {
    it('documents physician A → physician B scenario', () => {
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'Test Patient',
        memberDob: '1990-01-15',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.currentOwnerId).not.toBe(reassignment.newOwnerId);
      expect(reassignment.currentOwnerName).toBe('Dr. Smith');
      expect(reassignment.newOwnerName).toBe('Dr. Jones');
    });

    it('documents unassigned → physician scenario', () => {
      const reassignment: PatientReassignment = {
        patientId: 2,
        memberName: 'Unassigned Patient',
        memberDob: '1985-05-15',
        currentOwnerId: null,
        currentOwnerName: null,
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.currentOwnerId).toBeNull();
      expect(reassignment.newOwnerId).toBe(10);
      expect(reassignment.newOwnerName).toBe('Dr. Jones');
    });

    it('documents physician → unassigned scenario', () => {
      const reassignment: PatientReassignment = {
        patientId: 3,
        memberName: 'Assigned Patient',
        memberDob: '1975-12-25',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: null,
        newOwnerName: null,
      };

      expect(reassignment.currentOwnerId).toBe(5);
      expect(reassignment.currentOwnerName).toBe('Dr. Smith');
      expect(reassignment.newOwnerId).toBeNull();
      expect(reassignment.newOwnerName).toBeNull();
    });
  });

  describe('data format', () => {
    it('should have memberDob in YYYY-MM-DD format', () => {
      const reassignment: PatientReassignment = {
        patientId: 1,
        memberName: 'Test Patient',
        memberDob: '1990-01-15',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(reassignment.memberDob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have patientId as a positive number', () => {
      const reassignment: PatientReassignment = {
        patientId: 42,
        memberName: 'Test Patient',
        memberDob: '1990-01-15',
        currentOwnerId: 5,
        currentOwnerName: 'Dr. Smith',
        newOwnerId: 10,
        newOwnerName: 'Dr. Jones',
      };

      expect(typeof reassignment.patientId).toBe('number');
      expect(reassignment.patientId).toBeGreaterThan(0);
    });
  });
});

describe('Reassignment detection logic (unit tests)', () => {
  // Helper function to simulate reassignment detection logic
  function wouldReassign(
    currentOwnerId: number | null,
    targetOwnerId: number | null
  ): boolean {
    // Same owner → no reassignment
    if (currentOwnerId === targetOwnerId) return false;

    // Unassigned → unassigned → no reassignment
    if (currentOwnerId === null && targetOwnerId === null) return false;

    // Any other case → reassignment
    return true;
  }

  describe('same owner cases (no reassignment)', () => {
    it('should not reassign when current and target are same physician', () => {
      expect(wouldReassign(5, 5)).toBe(false);
    });

    it('should not reassign when both unassigned', () => {
      expect(wouldReassign(null, null)).toBe(false);
    });
  });

  describe('different owner cases (reassignment)', () => {
    it('should reassign from physician A to physician B', () => {
      expect(wouldReassign(5, 10)).toBe(true);
    });

    it('should reassign from unassigned to physician', () => {
      expect(wouldReassign(null, 10)).toBe(true);
    });

    it('should reassign from physician to unassigned', () => {
      expect(wouldReassign(5, null)).toBe(true);
    });
  });
});

describe('Reassignment display formatting', () => {
  it('should format "Physician → Physician" correctly', () => {
    const current = 'Dr. Smith';
    const newOwner = 'Dr. Jones';
    const display = `${current} → ${newOwner}`;

    expect(display).toBe('Dr. Smith → Dr. Jones');
  });

  it('should format "Unassigned → Physician" correctly', () => {
    const current: string | null = null;
    const newOwner = 'Dr. Jones';
    const display = `${current || 'Unassigned'} → ${newOwner}`;

    expect(display).toBe('Unassigned → Dr. Jones');
  });

  it('should format "Physician → Unassigned" correctly', () => {
    const current = 'Dr. Smith';
    const newOwner: string | null = null;
    const display = `${current} → ${newOwner || 'Unassigned'}`;

    expect(display).toBe('Dr. Smith → Unassigned');
  });
});
