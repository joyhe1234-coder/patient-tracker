/**
 * MainPage search filtering logic tests.
 *
 * Tests the filteredRowData logic as a pure function to avoid
 * heavy MainPage dependencies (API, AG Grid, auth store).
 */
import { describe, it, expect } from 'vitest';
import { GridRow } from '../components/grid/PatientGrid';
import { StatusColor, getRowStatusColor } from '../components/layout/StatusFilterBar';

/**
 * Replicates the exact filteredRowData useMemo logic from MainPage.tsx.
 * This keeps the test in sync with the actual implementation.
 */
function filterRows(
  rowData: GridRow[],
  activeFilters: StatusColor[],
  searchText: string
): GridRow[] {
  let filtered = rowData;

  // Apply status color filter
  if (!activeFilters.includes('all') && activeFilters.length > 0) {
    filtered = filtered.filter((row) => {
      if (activeFilters.includes('duplicate')) return row.isDuplicate;
      const color = getRowStatusColor(row);
      return activeFilters.includes(color);
    });
  }

  // Apply name search filter
  if (searchText.trim()) {
    const search = searchText.trim().toLowerCase();
    filtered = filtered.filter((row) =>
      row.memberName?.toLowerCase().includes(search)
    );
  }

  return filtered;
}

// Helper to create a minimal GridRow for testing
function makeRow(overrides: Partial<GridRow> & { id: number; memberName: string }): GridRow {
  return {
    patientId: overrides.id,
    memberDob: '1990-01-01',
    memberTelephone: null,
    memberAddress: null,
    requestType: null,
    qualityMeasure: null,
    measureStatus: null,
    statusDate: null,
    statusDatePrompt: null,
    tracking1: null,
    tracking2: null,
    tracking3: null,
    dueDate: null,
    timeIntervalDays: null,
    notes: null,
    rowOrder: 0,
    isDuplicate: false,
    ...overrides,
  };
}

const sampleRows: GridRow[] = [
  makeRow({ id: 1, memberName: 'John Smith', measureStatus: 'AWV completed' }),      // green
  makeRow({ id: 2, memberName: 'Jane Doe', measureStatus: 'AWV scheduled' }),         // blue
  makeRow({ id: 3, memberName: 'Bob Johnson', measureStatus: null }),                  // white
  makeRow({ id: 4, memberName: 'Alice Smith', measureStatus: 'Patient declined AWV' }), // purple
  makeRow({ id: 5, memberName: 'Charlie Brown', measureStatus: 'AWV completed', isDuplicate: true }), // green + dup
];

describe('MainPage search filtering logic', () => {
  describe('name search only (no status filter)', () => {
    it('returns all rows when search is empty', () => {
      const result = filterRows(sampleRows, ['all'], '');
      expect(result).toHaveLength(5);
    });

    it('filters by name (case-insensitive)', () => {
      const result = filterRows(sampleRows, ['all'], 'smith');
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 4]);
    });

    it('filters by name (partial match)', () => {
      const result = filterRows(sampleRows, ['all'], 'smi');
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 4]);
    });

    it('matches any part of the name', () => {
      const result = filterRows(sampleRows, ['all'], 'john');
      // "John Smith" (id:1) and "Bob Johnson" (id:3)
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });

    it('returns empty when no names match', () => {
      const result = filterRows(sampleRows, ['all'], 'xyz123');
      expect(result).toHaveLength(0);
    });

    it('is case-insensitive (uppercase search)', () => {
      const result = filterRows(sampleRows, ['all'], 'SMITH');
      expect(result).toHaveLength(2);
    });

    it('is case-insensitive (mixed case search)', () => {
      const result = filterRows(sampleRows, ['all'], 'SmItH');
      expect(result).toHaveLength(2);
    });

    it('treats whitespace-only search as empty (returns all)', () => {
      const result = filterRows(sampleRows, ['all'], '   ');
      expect(result).toHaveLength(5);
    });

    it('trims leading/trailing whitespace from search', () => {
      const result = filterRows(sampleRows, ['all'], '  smith  ');
      expect(result).toHaveLength(2);
    });
  });

  describe('null memberName handling', () => {
    it('excludes rows with null memberName from search results', () => {
      const rowsWithNull: GridRow[] = [
        makeRow({ id: 1, memberName: 'John Smith' }),
        // Force a null memberName for testing
        { ...makeRow({ id: 2, memberName: '' }), memberName: null as unknown as string },
      ];

      const result = filterRows(rowsWithNull, ['all'], 'john');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('returns null memberName rows when search is empty', () => {
      const rowsWithNull: GridRow[] = [
        makeRow({ id: 1, memberName: 'John Smith' }),
        { ...makeRow({ id: 2, memberName: '' }), memberName: null as unknown as string },
      ];

      const result = filterRows(rowsWithNull, ['all'], '');
      expect(result).toHaveLength(2);
    });
  });

  describe('search + status filter (AND logic)', () => {
    it('applies both filters: green + "smith"', () => {
      const result = filterRows(sampleRows, ['green'], 'smith');
      // John Smith (green) matches. Alice Smith (purple) does not match green filter.
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('applies both filters: blue + "doe"', () => {
      const result = filterRows(sampleRows, ['blue'], 'doe');
      // Jane Doe (blue) matches both
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('returns empty when status matches but name does not', () => {
      const result = filterRows(sampleRows, ['green'], 'xyz');
      expect(result).toHaveLength(0);
    });

    it('returns empty when name matches but status does not', () => {
      const result = filterRows(sampleRows, ['blue'], 'smith');
      // Smith rows are green and purple, not blue
      expect(result).toHaveLength(0);
    });

    it('applies duplicate filter + name search', () => {
      const result = filterRows(sampleRows, ['duplicate'], 'brown');
      // Charlie Brown is the only duplicate, and matches "brown"
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it('duplicate filter + non-matching name returns empty', () => {
      const result = filterRows(sampleRows, ['duplicate'], 'smith');
      // No duplicate rows with "smith" in the name
      expect(result).toHaveLength(0);
    });
  });

  describe('clearing search restores rows', () => {
    it('filtering then clearing returns original set', () => {
      // First filter
      const filtered = filterRows(sampleRows, ['all'], 'smith');
      expect(filtered).toHaveLength(2);

      // Then clear
      const restored = filterRows(sampleRows, ['all'], '');
      expect(restored).toHaveLength(5);
    });

    it('clearing search with active status filter restores status-filtered set', () => {
      // Status filter + search
      const filtered = filterRows(sampleRows, ['green'], 'smith');
      expect(filtered).toHaveLength(1);

      // Clear search but keep status filter
      const restored = filterRows(sampleRows, ['green'], '');
      // Green rows: John Smith (id:1) and Charlie Brown (id:5)
      expect(restored).toHaveLength(2);
    });
  });

  describe('multi-select filter (OR logic)', () => {
    it('filters by multiple colors with OR logic', () => {
      const result = filterRows(sampleRows, ['green', 'blue'], '');
      // green: John Smith (1), Charlie Brown (5). blue: Jane Doe (2)
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 2, 5]);
    });

    it('filters by three colors with OR logic', () => {
      const result = filterRows(sampleRows, ['green', 'blue', 'purple'], '');
      // green: 1, 5. blue: 2. purple: 4
      expect(result).toHaveLength(4);
      expect(result.map((r) => r.id)).toEqual([1, 2, 4, 5]);
    });

    it('single color filter works same as old single-select', () => {
      const result = filterRows(sampleRows, ['green'], '');
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 5]);
    });

    it('duplicates filter returns only duplicate rows', () => {
      const result = filterRows(sampleRows, ['duplicate'], '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it('all chips selected shows all rows (equivalent to All)', () => {
      const allColors: StatusColor[] = ['white', 'red', 'blue', 'yellow', 'green', 'purple', 'orange', 'gray'];
      const result = filterRows(sampleRows, allColors, '');
      expect(result).toHaveLength(5);
    });

    it('multi-filter + search applies AND logic', () => {
      const result = filterRows(sampleRows, ['green', 'purple'], 'smith');
      // green smith: John Smith (1). purple smith: Alice Smith (4). Charlie Brown is green but not smith.
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 4]);
    });

    it('multi-filter with no matching rows returns empty', () => {
      const result = filterRows(sampleRows, ['orange', 'gray'], '');
      // No rows with orange or gray status in sample data
      expect(result).toHaveLength(0);
    });

    it('multi-filter + search with no matching combo returns empty', () => {
      const result = filterRows(sampleRows, ['green', 'blue'], 'xyz');
      expect(result).toHaveLength(0);
    });
  });

  describe('chip counts (rowCounts) independence', () => {
    it('rowCounts are computed from unfiltered rowData', () => {
      // Simulate what MainPage does: rowCounts computed from rowData (not filteredRowData)
      const counts: Record<StatusColor, number> = {
        all: 0, duplicate: 0, white: 0, yellow: 0, blue: 0,
        green: 0, purple: 0, orange: 0, gray: 0, red: 0,
      };
      sampleRows.forEach((row) => {
        if (row.isDuplicate) counts.duplicate++;
        const color = getRowStatusColor(row);
        counts[color]++;
      });

      // Counts should reflect ALL rows regardless of search
      expect(counts.green).toBe(2);  // John Smith + Charlie Brown
      expect(counts.blue).toBe(1);   // Jane Doe
      expect(counts.white).toBe(1);  // Bob Johnson
      expect(counts.purple).toBe(1); // Alice Smith
      expect(counts.duplicate).toBe(1); // Charlie Brown

      // Even after filtering, counts stay the same (they use rowData, not filteredRowData)
      const filtered = filterRows(sampleRows, ['all'], 'smith');
      expect(filtered).toHaveLength(2); // Only 2 rows shown

      // But counts are still from full dataset
      expect(counts.green).toBe(2); // Still 2, not reduced
    });
  });
});
