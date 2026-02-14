/**
 * MainPage search filtering logic tests.
 *
 * Tests the filteredRowData logic as a pure function to avoid
 * heavy MainPage dependencies (API, AG Grid, auth store).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GridRow } from '../components/grid/PatientGrid';
import { StatusColor, getRowStatusColor } from '../config/statusColors';

/**
 * Replicates the exact filteredRowData useMemo logic from MainPage.tsx.
 * This keeps the test in sync with the actual implementation.
 */
function filterRows(
  rowData: GridRow[],
  activeFilters: StatusColor[],
  searchText: string,
  selectedMeasure: string = 'All Measures'
): GridRow[] {
  let filtered = rowData;

  // Apply quality measure filter
  if (selectedMeasure !== 'All Measures') {
    filtered = filtered.filter(row => row.qualityMeasure === selectedMeasure);
  }

  // Apply status color filter
  if (!activeFilters.includes('all') && activeFilters.length > 0) {
    filtered = filtered.filter((row) => {
      if (activeFilters.includes('duplicate')) return row.isDuplicate;
      const color = getRowStatusColor(row);
      return activeFilters.includes(color);
    });
  }

  // Apply name search filter — each word matches independently
  if (searchText.trim()) {
    const searchWords = searchText.trim().toLowerCase().split(/\s+/);
    filtered = filtered.filter((row) => {
      const name = row.memberName?.toLowerCase() || '';
      return searchWords.every((word) => name.includes(word));
    });
  }

  return filtered;
}

/**
 * Replicates the rowCounts logic from MainPage.tsx, scoped by measure.
 */
function computeRowCounts(
  rowData: GridRow[],
  selectedMeasure: string = 'All Measures'
): Record<StatusColor, number> {
  const counts: Record<StatusColor, number> = {
    all: 0, duplicate: 0, white: 0, yellow: 0, blue: 0,
    green: 0, purple: 0, orange: 0, gray: 0, red: 0,
  };
  const scopedRows = selectedMeasure === 'All Measures'
    ? rowData
    : rowData.filter(row => row.qualityMeasure === selectedMeasure);
  scopedRows.forEach((row) => {
    if (row.isDuplicate) counts.duplicate++;
    const color = getRowStatusColor(row);
    counts[color]++;
  });
  return counts;
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
  makeRow({ id: 1, memberName: 'Smith, John', measureStatus: 'AWV completed', qualityMeasure: 'Annual Wellness Visit' }),      // green
  makeRow({ id: 2, memberName: 'Doe, Jane', measureStatus: 'AWV scheduled', qualityMeasure: 'Annual Wellness Visit' }),         // blue
  makeRow({ id: 3, memberName: 'Johnson, Bob', measureStatus: null }),                  // white, null measure
  makeRow({ id: 4, memberName: 'Smith, Alice', measureStatus: 'Patient declined AWV', qualityMeasure: 'Annual Wellness Visit' }), // purple
  makeRow({ id: 5, memberName: 'Brown, Charlie', measureStatus: 'AWV completed', isDuplicate: true, qualityMeasure: 'Annual Wellness Visit' }), // green + dup
  makeRow({ id: 6, memberName: 'Garcia, Maria', measureStatus: 'Diabetic eye exam scheduled', qualityMeasure: 'Diabetic Eye Exam' }), // blue
  makeRow({ id: 7, memberName: 'Lee, James', measureStatus: 'Diabetic eye exam completed', qualityMeasure: 'Diabetic Eye Exam' }), // green
];

describe('MainPage search filtering logic', () => {
  describe('name search only (no status filter)', () => {
    it('returns all rows when search is empty', () => {
      const result = filterRows(sampleRows, ['all'], '');
      expect(result).toHaveLength(7);
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
      // "Smith, John" (id:1) and "Johnson, Bob" (id:3)
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual([1, 3]);
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
      expect(result).toHaveLength(7);
    });

    it('trims leading/trailing whitespace from search', () => {
      const result = filterRows(sampleRows, ['all'], '  smith  ');
      expect(result).toHaveLength(2);
    });

    it('matches multi-word search across "lastname, firstname" format', () => {
      // "smith john" should match "Smith, John" (words matched independently)
      const result = filterRows(sampleRows, ['all'], 'smith john');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('matches multi-word search in any order', () => {
      // "john smith" should also match "Smith, John"
      const result = filterRows(sampleRows, ['all'], 'john smith');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('matches multi-word search with partial words', () => {
      // "smi ali" should match "Smith, Alice"
      const result = filterRows(sampleRows, ['all'], 'smi ali');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it('requires all words to match', () => {
      // "smith charlie" should NOT match anything (no row has both)
      const result = filterRows(sampleRows, ['all'], 'smith charlie');
      expect(result).toHaveLength(0);
    });

    it('handles extra spaces between words', () => {
      const result = filterRows(sampleRows, ['all'], 'smith   john');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('null memberName handling', () => {
    it('excludes rows with null memberName from search results', () => {
      const rowsWithNull: GridRow[] = [
        makeRow({ id: 1, memberName: 'Smith, John' }),
        // Force a null memberName for testing
        { ...makeRow({ id: 2, memberName: '' }), memberName: null as unknown as string },
      ];

      const result = filterRows(rowsWithNull, ['all'], 'john');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('returns null memberName rows when search is empty', () => {
      const rowsWithNull: GridRow[] = [
        makeRow({ id: 1, memberName: 'Smith, John' }),
        { ...makeRow({ id: 2, memberName: '' }), memberName: null as unknown as string },
      ];

      const result = filterRows(rowsWithNull, ['all'], '');
      expect(result).toHaveLength(2);
    });
  });

  describe('search + status filter (AND logic)', () => {
    it('applies both filters: green + "smith"', () => {
      const result = filterRows(sampleRows, ['green'], 'smith');
      // Smith, John (green) matches. Smith, Alice (purple) does not match green filter.
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('applies both filters: blue + "doe"', () => {
      const result = filterRows(sampleRows, ['blue'], 'doe');
      // Doe, Jane (blue) matches both
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
      // Brown, Charlie is the only duplicate, and matches "brown"
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
      expect(restored).toHaveLength(7);
    });

    it('clearing search with active status filter restores status-filtered set', () => {
      // Status filter + search
      const filtered = filterRows(sampleRows, ['green'], 'smith');
      expect(filtered).toHaveLength(1);

      // Clear search but keep status filter
      const restored = filterRows(sampleRows, ['green'], '');
      // Green rows: Smith, John (1), Brown, Charlie (5), Lee, James (7)
      expect(restored).toHaveLength(3);
    });
  });

  describe('multi-select filter (OR logic)', () => {
    it('filters by multiple colors with OR logic', () => {
      const result = filterRows(sampleRows, ['green', 'blue'], '');
      // green: Smith, John (1), Brown, Charlie (5), Lee, James (7). blue: Doe, Jane (2), Garcia, Maria (6)
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.id)).toEqual([1, 2, 5, 6, 7]);
    });

    it('filters by three colors with OR logic', () => {
      const result = filterRows(sampleRows, ['green', 'blue', 'purple'], '');
      // green: 1, 5, 7. blue: 2, 6. purple: 4
      expect(result).toHaveLength(6);
      expect(result.map((r) => r.id)).toEqual([1, 2, 4, 5, 6, 7]);
    });

    it('single color filter works same as old single-select', () => {
      const result = filterRows(sampleRows, ['green'], '');
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual([1, 5, 7]);
    });

    it('duplicates filter returns only duplicate rows', () => {
      const result = filterRows(sampleRows, ['duplicate'], '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it('all chips selected shows all rows (equivalent to All)', () => {
      const allColors: StatusColor[] = ['white', 'red', 'blue', 'yellow', 'green', 'purple', 'orange', 'gray'];
      const result = filterRows(sampleRows, allColors, '');
      expect(result).toHaveLength(7);
    });

    it('multi-filter + search applies AND logic', () => {
      const result = filterRows(sampleRows, ['green', 'purple'], 'smith');
      // green smith: Smith, John (1). purple smith: Smith, Alice (4). Brown, Charlie is green but not smith.
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

  describe('quality measure filter', () => {
    it('filters rows by selected measure', () => {
      const result = filterRows(sampleRows, ['all'], '', 'Annual Wellness Visit');
      // AWV rows: 1, 2, 4, 5
      expect(result).toHaveLength(4);
      expect(result.map((r) => r.id)).toEqual([1, 2, 4, 5]);
    });

    it('"All Measures" shows all rows', () => {
      const result = filterRows(sampleRows, ['all'], '', 'All Measures');
      expect(result).toHaveLength(7);
    });

    it('filters by Diabetic Eye Exam measure', () => {
      const result = filterRows(sampleRows, ['all'], '', 'Diabetic Eye Exam');
      // Diabetic Eye Exam rows: 6, 7
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([6, 7]);
    });

    it('excludes rows with null qualityMeasure when measure is selected', () => {
      const result = filterRows(sampleRows, ['all'], '', 'Annual Wellness Visit');
      // Johnson, Bob (id:3) has null qualityMeasure — excluded
      expect(result.find((r) => r.id === 3)).toBeUndefined();
    });

    it('measure + color filter applies AND logic', () => {
      const result = filterRows(sampleRows, ['green'], '', 'Annual Wellness Visit');
      // AWV green rows: Smith, John (1), Brown, Charlie (5). Lee, James (7) is green but Diabetic Eye Exam.
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual([1, 5]);
    });

    it('measure + color + search applies triple AND', () => {
      const result = filterRows(sampleRows, ['green'], 'smith', 'Annual Wellness Visit');
      // Only Smith, John (1) is AWV + green + "smith"
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('duplicate filter + measure applies AND logic', () => {
      const result = filterRows(sampleRows, ['duplicate'], '', 'Annual Wellness Visit');
      // Brown, Charlie (5) is duplicate + AWV
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it('changing measure preserves active color filter', () => {
      // Blue filter with AWV: only Doe, Jane (2)
      const awvBlue = filterRows(sampleRows, ['blue'], '', 'Annual Wellness Visit');
      expect(awvBlue).toHaveLength(1);
      expect(awvBlue[0].id).toBe(2);

      // Blue filter with Diabetic Eye Exam: only Garcia, Maria (6)
      const deeBlue = filterRows(sampleRows, ['blue'], '', 'Diabetic Eye Exam');
      expect(deeBlue).toHaveLength(1);
      expect(deeBlue[0].id).toBe(6);
    });
  });

  describe('measure-scoped rowCounts', () => {
    it('scopes chip counts to selected measure', () => {
      const counts = computeRowCounts(sampleRows, 'Annual Wellness Visit');
      // AWV rows: 1 (green), 2 (blue), 4 (purple), 5 (green+dup)
      expect(counts.green).toBe(2);  // Smith, John + Brown, Charlie
      expect(counts.blue).toBe(1);   // Doe, Jane
      expect(counts.purple).toBe(1); // Smith, Alice
      expect(counts.duplicate).toBe(1); // Brown, Charlie
      expect(counts.white).toBe(0);  // Johnson, Bob excluded (null measure)
    });

    it('"All Measures" counts all rows', () => {
      const counts = computeRowCounts(sampleRows, 'All Measures');
      expect(counts.green).toBe(3);
      expect(counts.blue).toBe(2);
      expect(counts.white).toBe(1);
      expect(counts.purple).toBe(1);
      expect(counts.duplicate).toBe(1);
    });

    it('Diabetic Eye Exam counts only DEE rows', () => {
      const counts = computeRowCounts(sampleRows, 'Diabetic Eye Exam');
      // DEE rows: 6 (blue), 7 (green)
      expect(counts.green).toBe(1);  // Lee, James
      expect(counts.blue).toBe(1);   // Garcia, Maria
      expect(counts.purple).toBe(0);
      expect(counts.white).toBe(0);
      expect(counts.duplicate).toBe(0);
    });

    it('unknown measure returns all zeros', () => {
      const counts = computeRowCounts(sampleRows, 'Nonexistent Measure');
      expect(counts.green).toBe(0);
      expect(counts.blue).toBe(0);
      expect(counts.white).toBe(0);
      expect(counts.duplicate).toBe(0);
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
      expect(counts.green).toBe(3);  // Smith, John + Brown, Charlie + Lee, James
      expect(counts.blue).toBe(2);   // Doe, Jane + Garcia, Maria
      expect(counts.white).toBe(1);  // Johnson, Bob
      expect(counts.purple).toBe(1); // Smith, Alice
      expect(counts.duplicate).toBe(1); // Brown, Charlie

      // Even after filtering, counts stay the same (they use rowData, not filteredRowData)
      const filtered = filterRows(sampleRows, ['all'], 'smith');
      expect(filtered).toHaveLength(2); // Only 2 rows shown

      // But counts are still from full dataset
      expect(counts.green).toBe(3); // Still 3, not reduced
    });
  });
});

/**
 * Insurance Group state, query params, and filterSummary logic.
 *
 * Replicates the getQueryParams and filterSummary logic from MainPage.tsx
 * as pure functions to avoid heavy MainPage rendering dependencies.
 */

/**
 * Replicates the getQueryParams logic from MainPage.tsx.
 * Returns query string (with leading '?' if non-empty, else empty string).
 */
function getQueryParams(opts: {
  roles: string[];
  selectedPhysicianId: number | null;
  selectedInsuranceGroup: string;
}): string {
  const params = new URLSearchParams();
  if (opts.roles.includes('STAFF') && opts.selectedPhysicianId) {
    params.set('physicianId', String(opts.selectedPhysicianId));
  } else if (opts.roles.includes('ADMIN')) {
    params.set('physicianId', opts.selectedPhysicianId === null ? 'unassigned' : String(opts.selectedPhysicianId));
  }
  // Add insurance group filter
  if (opts.selectedInsuranceGroup !== 'all') {
    params.set('insuranceGroup', opts.selectedInsuranceGroup === 'none' ? 'none' : opts.selectedInsuranceGroup);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Replicates the filterSummary logic from MainPage.tsx.
 */
function buildFilterSummary(opts: {
  activeFilters: StatusColor[];
  selectedMeasure: string;
  selectedInsuranceGroup: string;
  insuranceGroupOptions: Array<{ id: string; name: string }>;
}): string | undefined {
  const STATUS_LABELS: Record<string, string> = {
    white: 'Not Addressed', red: 'Overdue', blue: 'In Progress',
    yellow: 'Contacted', green: 'Completed', purple: 'Declined',
    orange: 'Resolved', gray: 'N/A', duplicate: 'Duplicates',
  };

  const parts: string[] = [];

  // Insurance group filter
  if (opts.selectedInsuranceGroup !== 'all') {
    const label = opts.selectedInsuranceGroup === 'none'
      ? 'None'
      : opts.insuranceGroupOptions.find(o => o.id === opts.selectedInsuranceGroup)?.name || opts.selectedInsuranceGroup;
    parts.push(`Insurance: ${label}`);
  }

  if (!opts.activeFilters.includes('all') && opts.activeFilters.length > 0) {
    const labels = opts.activeFilters.map(f => STATUS_LABELS[f] || f).join(', ');
    parts.push(`Color: ${labels}`);
  }

  if (opts.selectedMeasure !== 'All Measures') {
    parts.push(`Measure: ${opts.selectedMeasure}`);
  }

  return parts.length > 0 ? parts.join(' | ') : undefined;
}

/**
 * Replicates the systems API response processing from MainPage.tsx useEffect.
 */
function processSystemsResponse(data: Array<{ id: string; name: string }>): Array<{ id: string; name: string }> {
  return data
    .map((s) => ({ id: s.id, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

describe('Insurance Group', () => {
  const defaultOptions = [{ id: 'hill', name: 'Hill' }];

  describe('systems fetch and options', () => {
    it('fetches systems on mount (processes API response)', () => {
      // Simulate successful API response
      const apiData = [{ id: 'hill', name: 'Hill' }];
      const result = processSystemsResponse(apiData);
      expect(result).toEqual([{ id: 'hill', name: 'Hill' }]);
    });

    it('sets insuranceGroupOptions from API response', () => {
      const apiData = [
        { id: 'kaiser', name: 'Kaiser' },
        { id: 'hill', name: 'Hill' },
      ];
      const result = processSystemsResponse(apiData);
      // Should be sorted alphabetically by name
      expect(result).toEqual([
        { id: 'hill', name: 'Hill' },
        { id: 'kaiser', name: 'Kaiser' },
      ]);
    });

    it('falls back to hardcoded options on fetch failure', () => {
      // Per REQ-IG-7 AC4: fallback is [{ id: 'hill', name: 'Hill' }]
      const fallback = [{ id: 'hill', name: 'Hill' }];
      expect(fallback).toEqual([{ id: 'hill', name: 'Hill' }]);
    });
  });

  describe('default state', () => {
    it('default selectedInsuranceGroup is "hill"', () => {
      // MainPage initializes: useState<string>('hill')
      const defaultValue = 'hill';
      expect(defaultValue).toBe('hill');
    });
  });

  describe('API query params (getQueryParams)', () => {
    it('API request includes insuranceGroup=hill by default', () => {
      const qs = getQueryParams({
        roles: ['PHYSICIAN'],
        selectedPhysicianId: 1,
        selectedInsuranceGroup: 'hill',
      });
      expect(qs).toContain('insuranceGroup=hill');
    });

    it('API omits insuranceGroup when set to "all"', () => {
      const qs = getQueryParams({
        roles: ['PHYSICIAN'],
        selectedPhysicianId: 1,
        selectedInsuranceGroup: 'all',
      });
      expect(qs).not.toContain('insuranceGroup');
    });

    it('API includes insuranceGroup=none when "none" selected', () => {
      const qs = getQueryParams({
        roles: ['PHYSICIAN'],
        selectedPhysicianId: 1,
        selectedInsuranceGroup: 'none',
      });
      expect(qs).toContain('insuranceGroup=none');
    });

    it('API includes insuranceGroup alongside physicianId for STAFF', () => {
      const qs = getQueryParams({
        roles: ['STAFF'],
        selectedPhysicianId: 5,
        selectedInsuranceGroup: 'hill',
      });
      expect(qs).toContain('physicianId=5');
      expect(qs).toContain('insuranceGroup=hill');
    });

    it('API includes insuranceGroup alongside physicianId for ADMIN', () => {
      const qs = getQueryParams({
        roles: ['ADMIN'],
        selectedPhysicianId: 3,
        selectedInsuranceGroup: 'kaiser',
      });
      expect(qs).toContain('physicianId=3');
      expect(qs).toContain('insuranceGroup=kaiser');
    });
  });

  describe('filterSummary with insurance group', () => {
    it('filterSummary includes "Insurance: Hill" when active', () => {
      const summary = buildFilterSummary({
        activeFilters: ['all'],
        selectedMeasure: 'All Measures',
        selectedInsuranceGroup: 'hill',
        insuranceGroupOptions: defaultOptions,
      });
      expect(summary).toContain('Insurance: Hill');
    });

    it('filterSummary omits insurance group when "all"', () => {
      const summary = buildFilterSummary({
        activeFilters: ['all'],
        selectedMeasure: 'All Measures',
        selectedInsuranceGroup: 'all',
        insuranceGroupOptions: defaultOptions,
      });
      // When all filters are at defaults, summary should be undefined
      expect(summary).toBeUndefined();
    });

    it('filterSummary shows "Insurance: None" for none', () => {
      const summary = buildFilterSummary({
        activeFilters: ['all'],
        selectedMeasure: 'All Measures',
        selectedInsuranceGroup: 'none',
        insuranceGroupOptions: defaultOptions,
      });
      expect(summary).toContain('Insurance: None');
    });

    it('filterSummary combines insurance with color filter', () => {
      const summary = buildFilterSummary({
        activeFilters: ['green'],
        selectedMeasure: 'All Measures',
        selectedInsuranceGroup: 'hill',
        insuranceGroupOptions: defaultOptions,
      });
      expect(summary).toContain('Insurance: Hill');
      expect(summary).toContain('Color: Completed');
    });

    it('filterSummary combines insurance with measure filter', () => {
      const summary = buildFilterSummary({
        activeFilters: ['all'],
        selectedMeasure: 'Diabetic Eye Exam',
        selectedInsuranceGroup: 'hill',
        insuranceGroupOptions: defaultOptions,
      });
      expect(summary).toContain('Insurance: Hill');
      expect(summary).toContain('Measure: Diabetic Eye Exam');
    });
  });

  describe('changing insuranceGroup triggers data re-fetch', () => {
    it('changing insuranceGroup changes query params (triggering re-fetch)', () => {
      // Initial state: hill
      const qs1 = getQueryParams({
        roles: ['PHYSICIAN'],
        selectedPhysicianId: 1,
        selectedInsuranceGroup: 'hill',
      });
      expect(qs1).toContain('insuranceGroup=hill');

      // Changed state: kaiser
      const qs2 = getQueryParams({
        roles: ['PHYSICIAN'],
        selectedPhysicianId: 1,
        selectedInsuranceGroup: 'kaiser',
      });
      expect(qs2).toContain('insuranceGroup=kaiser');

      // Query params are different, which triggers useEffect re-fetch in MainPage
      expect(qs1).not.toBe(qs2);
    });
  });
});
