/**
 * FIELD_DISPLAY_NAMES Tests
 *
 * Tests for the field display name mapping used in ConflictModal
 * and remote edit notifications. Ensures all editable grid columns
 * have human-readable labels.
 */

import { describe, it, expect } from 'vitest';
import { FIELD_DISPLAY_NAMES } from './useGridCellUpdate';

describe('FIELD_DISPLAY_NAMES', () => {
  const EXPECTED_KEYS = [
    'requestType',
    'memberName',
    'memberDob',
    'memberTelephone',
    'memberAddress',
    'qualityMeasure',
    'measureStatus',
    'statusDate',
    'tracking1',
    'tracking2',
    'dueDate',
    'timeIntervalDays',
    'notes',
  ];

  it('contains all 13 editable grid column keys', () => {
    for (const key of EXPECTED_KEYS) {
      expect(FIELD_DISPLAY_NAMES).toHaveProperty(key);
    }
    expect(Object.keys(FIELD_DISPLAY_NAMES)).toHaveLength(13);
  });

  it('all display names are non-empty strings', () => {
    for (const [key, value] of Object.entries(FIELD_DISPLAY_NAMES)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('core field mappings are human-readable', () => {
    expect(FIELD_DISPLAY_NAMES.requestType).toBe('Request Type');
    expect(FIELD_DISPLAY_NAMES.measureStatus).toBe('Measure Status');
    expect(FIELD_DISPLAY_NAMES.tracking1).toBe('Tracking #1');
    expect(FIELD_DISPLAY_NAMES.memberDob).toBe('Member DOB');
  });

  it('no duplicate display names', () => {
    const values = Object.values(FIELD_DISPLAY_NAMES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('patient data columns are all mapped', () => {
    const patientColumns = ['memberName', 'memberDob', 'memberTelephone', 'memberAddress'];
    for (const col of patientColumns) {
      expect(FIELD_DISPLAY_NAMES).toHaveProperty(col);
      expect(FIELD_DISPLAY_NAMES[col].length).toBeGreaterThan(0);
    }
  });
});
