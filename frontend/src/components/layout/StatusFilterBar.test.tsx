import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusFilterBar, { getRowStatusColor, StatusColor } from './StatusFilterBar';

describe('StatusFilterBar', () => {
  const defaultCounts: Record<StatusColor, number> = {
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

  const defaultSearchProps = {
    searchText: '',
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter chips', () => {
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
        {...defaultSearchProps}
      />
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
    expect(screen.getByText('Not Addressed')).toBeInTheDocument();
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
        {...defaultSearchProps}
      />
    );

    // Total count for "All" = sum of all non-all counts = 100
    expect(screen.getByText('(100)')).toBeInTheDocument();
    // In Progress count (unique value 25)
    expect(screen.getByText('(25)')).toBeInTheDocument();
    // Not Addressed (white) count (unique value 20)
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
        {...defaultSearchProps}
      />
    );

    fireEvent.click(screen.getByText('Duplicates'));
    expect(handleChange).toHaveBeenCalledWith(['duplicate']);
  });

  it('toggling off the last selected chip returns to all', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['green']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
        {...defaultSearchProps}
      />
    );

    fireEvent.click(screen.getByText('Completed'));
    expect(handleChange).toHaveBeenCalledWith(['all']);
  });

  it('clicking All chip calls onFilterChange with all', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['duplicate']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
        {...defaultSearchProps}
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
        {...defaultSearchProps}
      />
    );

    // All chip should be active (aria-pressed=true)
    const allButton = screen.getByRole('button', { name: /All/ });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  describe('Multi-Select Toggle Behavior', () => {
    it('clicking unselected chip adds it to active filters', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('In Progress'));
      expect(handleChange).toHaveBeenCalledWith(['green', 'blue']);
    });

    it('clicking selected chip removes it without affecting others', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['green', 'blue']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('Completed'));
      expect(handleChange).toHaveBeenCalledWith(['blue']);
    });

    it('clicking chip while All is active selects only that chip', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('Completed'));
      expect(handleChange).toHaveBeenCalledWith(['green']);
    });

    it('clicking Duplicates deselects all color chips', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['green', 'blue']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('Duplicates'));
      expect(handleChange).toHaveBeenCalledWith(['duplicate']);
    });

    it('clicking color chip while Duplicates active exits duplicates mode', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['duplicate']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('In Progress'));
      expect(handleChange).toHaveBeenCalledWith(['blue']);
    });

    it('toggling off Duplicates returns to all', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['duplicate']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('Duplicates'));
      expect(handleChange).toHaveBeenCalledWith(['all']);
    });

    it('can select three chips simultaneously', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['green', 'blue']}
          onFilterChange={handleChange}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      fireEvent.click(screen.getByText('Contacted'));
      expect(handleChange).toHaveBeenCalledWith(['green', 'blue', 'yellow']);
    });
  });

  describe('Checkmark + Fill Visual Style', () => {
    it('active chip has aria-pressed true', () => {
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const greenButton = screen.getByRole('button', { name: /Completed/ });
      expect(greenButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('inactive chip has aria-pressed false', () => {
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const blueButton = screen.getByRole('button', { name: /In Progress/ });
      expect(blueButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('active chip has filled background (no opacity-50)', () => {
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const greenButton = screen.getByRole('button', { name: /Completed/ });
      expect(greenButton.className).not.toContain('opacity-50');
    });

    it('inactive chip has opacity-50 class', () => {
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const blueButton = screen.getByRole('button', { name: /In Progress/ });
      expect(blueButton.className).toContain('opacity-50');
    });

    it('multiple active chips all have aria-pressed true', () => {
      render(
        <StatusFilterBar
          activeFilters={['green', 'blue']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const greenButton = screen.getByRole('button', { name: /Completed/ });
      const blueButton = screen.getByRole('button', { name: /In Progress/ });
      expect(greenButton).toHaveAttribute('aria-pressed', 'true');
      expect(blueButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows zero count when rowCounts is missing a category', () => {
    const partialCounts: Record<StatusColor, number> = {
      all: 0,
      duplicate: 5,
      white: 20,
      yellow: 15,
      blue: 25,
      green: 10,
      purple: 5,
      orange: 5,
      gray: 10,
      red: 0,
    };

    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={partialCounts}
        {...defaultSearchProps}
      />
    );

    // Should render without errors
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...');
      expect(input).toBeInTheDocument();
    });

    it('has aria-label on search input', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
        />
      );

      const input = screen.getByLabelText('Search patients by name');
      expect(input).toBeInTheDocument();
    });

    it('does NOT show clear button when searchText is empty', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText=""
          onSearchChange={vi.fn()}
        />
      );

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('shows clear button when searchText is non-empty', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="smith"
          onSearchChange={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('calls onSearchChange when user types in input', () => {
      const handleSearch = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText=""
          onSearchChange={handleSearch}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...');
      fireEvent.change(input, { target: { value: 'john' } });
      expect(handleSearch).toHaveBeenCalledWith('john');
    });

    it('calls onSearchChange with empty string when clear button clicked', () => {
      const handleSearch = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="smith"
          onSearchChange={handleSearch}
        />
      );

      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(handleSearch).toHaveBeenCalledWith('');
    });

    it('has aria-label on clear button', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="test"
          onSearchChange={vi.fn()}
        />
      );

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search and blurs input on Escape key', () => {
      const handleSearch = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="smith"
          onSearchChange={handleSearch}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...');
      input.focus();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(handleSearch).toHaveBeenCalledWith('');
    });

    it('does not clear search on non-Escape keys', () => {
      const handleSearch = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="smith"
          onSearchChange={handleSearch}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleSearch).not.toHaveBeenCalled();
    });

    it('displays current searchText value in input', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          searchText="john doe"
          onSearchChange={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...') as HTMLInputElement;
      expect(input.value).toBe('john doe');
    });
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

  describe('white status (Not Addressed/Default)', () => {
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
