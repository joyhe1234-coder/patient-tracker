import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import StatusFilterBar, { getRowStatusColor } from './StatusFilterBar';

describe('StatusFilterBar', () => {
  const defaultCounts = {
    all: 0,
    duplicate: 5,
    white: 20,
    yellow: 15,
    blue: 25,
    green: 10,
    purple: 5,
    orange: 5,
    gray: 10,
    red: 5,
  };

  it('renders all filter chips', () => {
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
      />
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('displays correct counts on chips', () => {
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
      />
    );

    // Total count for "All" = sum of all non-all counts = 100
    expect(screen.getByText('(100)')).toBeInTheDocument();
    // In Progress count (unique value 25)
    expect(screen.getByText('(25)')).toBeInTheDocument();
    // Not Started (white) count (unique value 20)
    expect(screen.getByText('(20)')).toBeInTheDocument();
    // Contacted count (unique value 15)
    expect(screen.getByText('(15)')).toBeInTheDocument();
  });

  it('calls onFilterChange when chip clicked', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
      />
    );

    fireEvent.click(screen.getByText('Duplicates'));
    expect(handleChange).toHaveBeenCalledWith(['duplicate']);
  });

  it('clicking selected filter returns to all', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['duplicate']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
      />
    );

    fireEvent.click(screen.getByText('Duplicates'));
    expect(handleChange).toHaveBeenCalledWith(['all']);
  });

  it('clicking All chip calls onFilterChange with all', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['duplicate']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
      />
    );

    fireEvent.click(screen.getByText('All'));
    expect(handleChange).toHaveBeenCalledWith(['all']);
  });

  it('treats empty activeFilters as all selected', () => {
    render(
      <StatusFilterBar
        activeFilters={[]}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
      />
    );

    // All chip should be active (has ring-2 class)
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton.className).toContain('ring-2');
  });

  it('shows zero count when rowCounts is missing a category', () => {
    const partialCounts = {
      all: 0,
      duplicate: 5,
      white: 20,
      yellow: 15,
      blue: 25,
      green: 10,
      purple: 5,
      orange: 5,
      gray: 10,
      red: 0, // Missing or zero
    };

    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={partialCounts}
      />
    );

    // Should render without errors
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});

describe('getRowStatusColor', () => {
  // Helper to get a date string in the past
  const getPastDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  // Helper to get a date string in the future
  const getFutureDate = (daysAhead: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString();
  };

  describe('gray statuses (N/A)', () => {
    it('returns gray for "No longer applicable"', () => {
      const result = getRowStatusColor({
        measureStatus: 'No longer applicable',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('gray');
    });

    it('returns gray for "Screening unnecessary"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Screening unnecessary',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('gray');
    });
  });

  describe('purple statuses (Declined)', () => {
    it('returns purple for "Patient declined AWV"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Patient declined AWV',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('purple');
    });

    it('returns purple for "Contraindicated"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Contraindicated',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('purple');
    });
  });

  describe('green statuses (Completed)', () => {
    it('returns green for "AWV completed"', () => {
      const result = getRowStatusColor({
        measureStatus: 'AWV completed',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('green');
    });

    it('returns green for "Blood pressure at goal"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Blood pressure at goal',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('green');
    });
  });

  describe('blue statuses (In Progress)', () => {
    it('returns blue for "AWV scheduled"', () => {
      const result = getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('blue');
    });

    it('returns blue for "Appointment scheduled"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Appointment scheduled',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('blue');
    });
  });

  describe('yellow statuses (Contacted)', () => {
    it('returns yellow for "Patient called to schedule AWV"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Patient called to schedule AWV',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('yellow');
    });

    it('returns yellow for "Screening discussed"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Screening discussed',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('yellow');
    });
  });

  describe('orange statuses (Resolved)', () => {
    it('returns orange for "Chronic diagnosis resolved"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('orange');
    });

    it('returns orange for "Chronic diagnosis invalid"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis invalid',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('orange');
    });
  });

  describe('white status (Not Started/Default)', () => {
    it('returns white for empty status', () => {
      const result = getRowStatusColor({
        measureStatus: '',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('white');
    });

    it('returns white for null status', () => {
      const result = getRowStatusColor({
        measureStatus: null,
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('white');
    });

    it('returns white for unrecognized status', () => {
      const result = getRowStatusColor({
        measureStatus: 'Unknown status',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('white');
    });
  });

  describe('overdue (red) handling', () => {
    it('returns red when dueDate is in the past for white status', () => {
      const result = getRowStatusColor({
        measureStatus: '',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('red');
    });

    it('returns red when dueDate is in the past for green status', () => {
      const result = getRowStatusColor({
        measureStatus: 'AWV completed',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('red');
    });

    it('does NOT return red for overdue gray status', () => {
      const result = getRowStatusColor({
        measureStatus: 'No longer applicable',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('gray');
    });

    it('does NOT return red for overdue purple status', () => {
      const result = getRowStatusColor({
        measureStatus: 'Patient declined AWV',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('purple');
    });

    it('does NOT return red for overdue orange status', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('orange');
    });

    it('returns blue when dueDate is in the future', () => {
      const result = getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: getFutureDate(5),
      });
      expect(result).toBe('blue');
    });

    it('returns normal status color when dueDate is null', () => {
      const result = getRowStatusColor({
        measureStatus: 'AWV completed',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('green');
    });
  });
});
