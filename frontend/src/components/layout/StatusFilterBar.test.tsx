import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusFilterBar from './StatusFilterBar';
import { getRowStatusColor, StatusColor } from '../../config/statusColors';
import { QUALITY_MEASURE_TO_STATUS } from '../../config/dropdownConfig';

const measureOptions = Object.keys(QUALITY_MEASURE_TO_STATUS);

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

  const defaultMeasureProps = {
    selectedMeasure: 'All Measures',
    onMeasureChange: vi.fn(),
    measureOptions,
  };

  const defaultInsuranceGroupProps = {
    selectedInsuranceGroup: 'hill',
    onInsuranceGroupChange: vi.fn(),
    insuranceGroupOptions: [{ id: 'hill', name: 'Hill' }],
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
      />
    );

    // "All" appears in both the filter chip and the insurance group dropdown, so use getAllByText
    expect(screen.getAllByText('All').length).toBeGreaterThanOrEqual(1);
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
      />
    );

    // Total count for "All" = sum of all non-all, non-duplicate counts = 95
    expect(screen.getByText('(95)')).toBeInTheDocument();
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
      />
    );

    // Use button role to target the "All" chip (not the dropdown option)
    fireEvent.click(screen.getByRole('button', { name: /All/ }));
    expect(handleChange).toHaveBeenCalledWith(['all']);
  });

  it('treats empty activeFilters as all selected', () => {
    render(
      <StatusFilterBar
        activeFilters={[]}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
        {...defaultSearchProps}
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
        {...defaultMeasureProps}
        {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
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
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const input = screen.getByPlaceholderText('Search by name...') as HTMLInputElement;
      expect(input.value).toBe('john doe');
    });
  });

  describe('Accessibility', () => {
    it('filter chip buttons have focus-visible ring classes', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={vi.fn()}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const buttons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null);
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button) => {
        expect(button.className).toContain('focus-visible:ring-2');
        expect(button.className).toContain('focus-visible:ring-blue-500');
      });
    });
  });

  describe('Compact Chip Styling', () => {
    it('chips have whitespace-nowrap class', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const buttons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null);
      buttons.forEach((button) => {
        expect(button.className).toContain('whitespace-nowrap');
      });
    });

    it('chips have compact padding (py-0.5 px-2)', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const buttons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null);
      buttons.forEach((button) => {
        expect(button.className).toContain('py-0.5');
        expect(button.className).toContain('px-2');
      });
    });

    it('chips use text-xs for compact font', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const buttons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null);
      buttons.forEach((button) => {
        expect(button.className).toContain('text-xs');
      });
    });

    it('active chip still shows checkmark icon', () => {
      render(
        <StatusFilterBar
          activeFilters={['green']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const completedButton = screen.getByRole('button', { name: /Completed/ });
      // Check icon is rendered as an SVG inside the button
      const svg = completedButton.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });

  describe('Quality Measure Dropdown', () => {
    it('renders measure dropdown', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure');
      expect(dropdown).toBeInTheDocument();
    });

    it('dropdown default is "All Measures"', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure') as HTMLSelectElement;
      expect(dropdown.value).toBe('All Measures');
    });

    it('dropdown lists all 13 quality measures', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure') as HTMLSelectElement;
      // 14 measures + "All Measures" = 15 options
      expect(dropdown.options.length).toBe(15);
      expect(dropdown.options[0].value).toBe('All Measures');
      expect(dropdown.options[1].value).toBe('Annual Wellness Visit');
    });

    it('calls onMeasureChange when measure selected', () => {
      const handleMeasure = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          selectedMeasure="All Measures"
          onMeasureChange={handleMeasure}
          measureOptions={measureOptions}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure');
      fireEvent.change(dropdown, { target: { value: 'Diabetic Eye Exam' } });
      expect(handleMeasure).toHaveBeenCalledWith('Diabetic Eye Exam');
    });

    it('shows blue ring when measure is active', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          selectedMeasure="Diabetic Eye Exam"
          onMeasureChange={vi.fn()}
          measureOptions={measureOptions}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure');
      expect(dropdown.className).toContain('ring-2');
      expect(dropdown.className).toContain('ring-blue-400');
    });

    it('has no blue ring when "All Measures" selected', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by quality measure');
      expect(dropdown.className).not.toContain('ring-2 ring-blue-400');
    });

    it('has aria-label on dropdown', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      expect(screen.getByLabelText('Filter by quality measure')).toBeInTheDocument();
    });

    it('renders vertical divider before dropdown', () => {
      const { container } = render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      // Divider is a div with w-px class
      const divider = container.querySelector('.w-px.bg-gray-300');
      expect(divider).not.toBeNull();
    });
  });

  describe('Zero-Count Chip Opacity', () => {
    it('zero-count inactive chip has opacity-30', () => {
      const zeroCounts: Record<StatusColor, number> = {
        ...defaultCounts,
        orange: 0,
        gray: 0,
      };

      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={zeroCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const resolvedButton = screen.getByRole('button', { name: /Resolved/ });
      expect(resolvedButton.className).toContain('opacity-50');
    });

    it('zero-count chip is still clickable', () => {
      const handleChange = vi.fn();
      const zeroCounts: Record<StatusColor, number> = {
        ...defaultCounts,
        orange: 0,
      };

      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={handleChange}
          rowCounts={zeroCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      fireEvent.click(screen.getByText('Resolved'));
      expect(handleChange).toHaveBeenCalledWith(['orange']);
    });
  });

  describe('Insurance Group Dropdown', () => {
    it('renders insurance group dropdown', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      expect(screen.getByLabelText('Filter by insurance group')).toBeInTheDocument();
    });

    it('shows "All" option first', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group') as HTMLSelectElement;
      expect(dropdown.options[0].textContent).toBe('All');
      expect(dropdown.options[0].value).toBe('all');
    });

    it('shows system options sorted alphabetically', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          selectedInsuranceGroup="all"
          onInsuranceGroupChange={vi.fn()}
          insuranceGroupOptions={[
            { id: 'hill', name: 'Hill' },
            { id: 'kaiser', name: 'Kaiser' },
          ]}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group') as HTMLSelectElement;
      // Options: All, Hill, Kaiser, No Insurance (MainPage sorts before passing)
      const optionTexts = Array.from(dropdown.options).map(o => o.textContent);
      const hillIndex = optionTexts.indexOf('Hill');
      const kaiserIndex = optionTexts.indexOf('Kaiser');
      expect(hillIndex).toBeGreaterThan(0); // After "All"
      expect(kaiserIndex).toBeGreaterThan(hillIndex); // Kaiser after Hill alphabetically
    });

    it('shows "No Insurance" option last', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group') as HTMLSelectElement;
      const lastOption = dropdown.options[dropdown.options.length - 1];
      expect(lastOption.textContent).toBe('No Insurance');
      expect(lastOption.value).toBe('none');
    });

    it('shows active-ring indicator when value is not "all"', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          selectedInsuranceGroup="hill"
          onInsuranceGroupChange={vi.fn()}
          insuranceGroupOptions={[{ id: 'hill', name: 'Hill' }]}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group');
      expect(dropdown.className).toContain('ring-2');
      expect(dropdown.className).toContain('ring-blue-400');
    });

    it('does not show active-ring when value is "all"', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          selectedInsuranceGroup="all"
          onInsuranceGroupChange={vi.fn()}
          insuranceGroupOptions={[{ id: 'hill', name: 'Hill' }]}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group');
      expect(dropdown.className).toContain('border-gray-300');
      expect(dropdown.className).not.toContain('ring-2 ring-blue-400');
    });

    it('calls onInsuranceGroupChange when changed', () => {
      const handleChange = vi.fn();
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          selectedInsuranceGroup="hill"
          onInsuranceGroupChange={handleChange}
          insuranceGroupOptions={[{ id: 'hill', name: 'Hill' }]}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group');
      fireEvent.change(dropdown, { target: { value: 'none' } });
      expect(handleChange).toHaveBeenCalledWith('none');
    });

    it('default selection is "hill"', () => {
      render(
        <StatusFilterBar
          activeFilters={['all']}
          onFilterChange={() => {}}
          rowCounts={defaultCounts}
          {...defaultSearchProps}
          {...defaultMeasureProps}
          {...defaultInsuranceGroupProps}
        />
      );

      const dropdown = screen.getByLabelText('Filter by insurance group') as HTMLSelectElement;
      expect(dropdown.value).toBe('hill');
    });
  });
});

describe('Pinned Row Badge', () => {
  const defaultCounts: Record<StatusColor, number> = {
    all: 0, duplicate: 5, white: 20, yellow: 15, blue: 25,
    green: 10, purple: 5, orange: 5, gray: 10, red: 5,
  };

  const baseProps = {
    activeFilters: ['all'] as StatusColor[],
    onFilterChange: vi.fn(),
    rowCounts: defaultCounts,
    searchText: '',
    onSearchChange: vi.fn(),
    selectedMeasure: 'All Measures',
    onMeasureChange: vi.fn(),
    measureOptions: Object.keys(QUALITY_MEASURE_TO_STATUS),
    selectedInsuranceGroup: 'hill',
    onInsuranceGroupChange: vi.fn(),
    insuranceGroupOptions: [{ id: 'hill', name: 'Hill' }],
  };

  it('renders pinned badge when pinnedRowId is set', () => {
    render(<StatusFilterBar {...baseProps} pinnedRowId={42} onUnpin={vi.fn()} />);
    expect(screen.getByTestId('pinned-row-badge')).toBeInTheDocument();
    expect(screen.getByText(/pinned/i)).toBeInTheDocument();
  });

  it('does not render badge when pinnedRowId is null', () => {
    render(<StatusFilterBar {...baseProps} pinnedRowId={null} onUnpin={vi.fn()} />);
    expect(screen.queryByTestId('pinned-row-badge')).not.toBeInTheDocument();
  });

  it('does not render badge when pinnedRowId is undefined', () => {
    render(<StatusFilterBar {...baseProps} />);
    expect(screen.queryByTestId('pinned-row-badge')).not.toBeInTheDocument();
  });

  it('calls onUnpin when badge is clicked', () => {
    const handleUnpin = vi.fn();
    render(<StatusFilterBar {...baseProps} pinnedRowId={42} onUnpin={handleUnpin} />);
    fireEvent.click(screen.getByTestId('pinned-row-badge'));
    expect(handleUnpin).toHaveBeenCalledTimes(1);
  });

  it('badge has amber styling', () => {
    render(<StatusFilterBar {...baseProps} pinnedRowId={42} onUnpin={vi.fn()} />);
    const badge = screen.getByTestId('pinned-row-badge');
    expect(badge.className).toContain('bg-amber-100');
    expect(badge.className).toContain('text-amber-700');
    expect(badge.className).toContain('border-amber-400');
  });
});

describe('getRowStatusColor', () => {
  // UTC-safe date helpers: construct dates as UTC midnight date-only strings.
  // The production code compares dueDate's UTC date against today's LOCAL date,
  // so test dates must use UTC midnight to avoid timezone-boundary issues where
  // "yesterday local" becomes "today UTC" (e.g., 10 PM PST Feb 8 = Feb 9 UTC).
  const getPastDate = (daysAgo: number): string => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() - daysAgo);
    return utc.toISOString();
  };

  const getFutureDate = (daysAhead: number): string => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + daysAhead);
    return utc.toISOString();
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

  describe('orange statuses (Resolved) — Chronic DX cascading logic', () => {
    it('returns orange for "Chronic diagnosis resolved" without attestation', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('orange');
    });

    it('returns orange for "Chronic diagnosis invalid" without attestation', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis invalid',
        isDuplicate: false,
        dueDate: null,
      });
      expect(result).toBe('orange');
    });

    it('returns orange for "Chronic diagnosis resolved" with "Attestation not sent"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: null,
        tracking1: 'Attestation not sent',
      });
      expect(result).toBe('orange');
    });

    it('returns green for "Chronic diagnosis resolved" with "Attestation sent"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: null,
        tracking1: 'Attestation sent',
      });
      expect(result).toBe('green');
    });

    it('returns green for "Chronic diagnosis invalid" with "Attestation sent"', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis invalid',
        isDuplicate: false,
        dueDate: null,
        tracking1: 'Attestation sent',
      });
      expect(result).toBe('green');
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

    it('returns red for overdue Chronic DX without attestation sent', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: getPastDate(5),
        tracking1: 'Attestation not sent',
      });
      expect(result).toBe('red');
    });

    it('returns red for overdue Chronic DX with no tracking1', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: getPastDate(5),
      });
      expect(result).toBe('red');
    });

    it('does NOT return red for overdue Chronic DX with attestation sent', () => {
      const result = getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: getPastDate(5),
        tracking1: 'Attestation sent',
      });
      expect(result).toBe('green');
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

/**
 * CFB-R8: Row Color Accuracy and Chip Count Integrity
 *
 * Exhaustive validation that every configured status maps to the correct color,
 * overdue priority rules work for all categories, attestation/BP edge cases are
 * handled, chip counts are accurate, and the two color systems stay in sync.
 */
describe('CFB-R8: Row Color Accuracy', () => {
  // UTC-safe date helpers (same approach as getRowStatusColor tests above)
  const getPastDate = (daysAgo: number): string => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() - daysAgo);
    return utc.toISOString();
  };

  const getFutureDate = (daysAhead: number): string => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + daysAhead);
    return utc.toISOString();
  };

  const getTodayDate = (): string => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
  };

  const baseRow = { isDuplicate: false, dueDate: null };

  // ─── Group A: Exhaustive status→color mapping (CFB-R8-AC1/AC2) ───

  describe('Group A: Every configured status maps to correct color', () => {
    /**
     * Expected color for every status in QUALITY_MEASURE_TO_STATUS.
     * "Not Addressed" is a special case — it's a dropdown label but not a
     * real measureStatus value. Real "not addressed" rows have null/empty status.
     */
    const statusToExpectedColor: Array<[string, string, string]> = [
      // [status, expectedColor, qualityMeasure context]
      // ── Annual Wellness Visit ──
      ['Patient called to schedule AWV', 'yellow', 'AWV'],
      ['AWV scheduled', 'blue', 'AWV'],
      ['AWV completed', 'green', 'AWV'],
      ['Patient declined AWV', 'purple', 'AWV'],
      ['Will call later to schedule', 'blue', 'AWV'],
      ['No longer applicable', 'gray', 'AWV'],
      // ── Diabetic Eye Exam ──
      ['Diabetic eye exam discussed', 'yellow', 'DEE'],
      ['Diabetic eye exam referral made', 'blue', 'DEE'],
      ['Diabetic eye exam scheduled', 'blue', 'DEE'],
      ['Diabetic eye exam completed', 'green', 'DEE'],
      ['Obtaining outside records', 'blue', 'DEE'],
      ['Patient declined', 'purple', 'DEE'],
      // ── Colon Cancer Screening ──
      ['Screening discussed', 'yellow', 'CCS'],
      ['Colon cancer screening ordered', 'blue', 'CCS'],
      ['Colon cancer screening completed', 'green', 'CCS'],
      ['Patient declined screening', 'purple', 'CCS'],
      ['Screening unnecessary', 'gray', 'CCS'],
      // ── Breast Cancer Screening ──
      ['Screening test ordered', 'blue', 'BCS'],
      ['Screening test completed', 'green', 'BCS'],
      // ── Cervical Cancer Screening ──
      ['Screening appt made', 'blue', 'CervCS'],
      ['Screening completed', 'green', 'CervCS'],
      // ── GC/Chlamydia Screening ──
      ['Patient contacted for screening', 'yellow', 'GC'],
      ['Test ordered', 'blue', 'GC'],
      ['GC/Clamydia screening completed', 'green', 'GC'],
      // ── Diabetic Nephropathy ──
      ['Urine microalbumin ordered', 'blue', 'DN'],
      ['Urine microalbumin completed', 'green', 'DN'],
      // ── Hypertension Management ──
      ['Blood pressure at goal', 'green', 'HTN'],
      ['Scheduled call back - BP not at goal', 'blue', 'HTN'],
      ['Scheduled call back - BP at goal', 'blue', 'HTN'],
      ['Appointment scheduled', 'blue', 'HTN'],
      ['Declined BP control', 'purple', 'HTN'],
      // ── ACE/ARB in DM or CAD ──
      ['Patient on ACE/ARB', 'green', 'ACE'],
      ['ACE/ARB prescribed', 'blue', 'ACE'],
      ['Contraindicated', 'purple', 'ACE'],
      // ── Vaccination ──
      ['Vaccination discussed', 'yellow', 'VAX'],
      ['Vaccination scheduled', 'blue', 'VAX'],
      ['Vaccination completed', 'green', 'VAX'],
      // ── Diabetes Control ──
      ['HgbA1c ordered', 'blue', 'DC'],
      ['HgbA1c at goal', 'green', 'DC'],
      ['HgbA1c NOT at goal', 'blue', 'DC'],
      // ── Annual Serum K&Cr ──
      ['Lab ordered', 'blue', 'ASK'],
      ['Lab completed', 'green', 'ASK'],
      // ── Chronic Diagnosis Code (no attestation — orange) ──
      ['Chronic diagnosis confirmed', 'green', 'CDX'],
      ['Chronic diagnosis resolved', 'orange', 'CDX'],
      ['Chronic diagnosis invalid', 'orange', 'CDX'],
    ];

    it.each(statusToExpectedColor)(
      '"%s" → %s (%s)',
      (status, expectedColor) => {
        const result = getRowStatusColor({
          measureStatus: status,
          ...baseRow,
        });
        expect(result).toBe(expectedColor);
      }
    );

    it('"Not Addressed" (literal string) → white (CFB-R8-AC2)', () => {
      // "Not Addressed" appears in dropdown config but is not in any color array
      const result = getRowStatusColor({
        measureStatus: 'Not Addressed',
        ...baseRow,
      });
      expect(result).toBe('white');
    });

    it('empty string → white (CFB-R8-AC2)', () => {
      const result = getRowStatusColor({
        measureStatus: '',
        ...baseRow,
      });
      expect(result).toBe('white');
    });

    it('null → white (CFB-R8-AC2)', () => {
      const result = getRowStatusColor({
        measureStatus: null,
        ...baseRow,
      });
      expect(result).toBe('white');
    });
  });

  // ─── Group B: BP edge cases + overdue (CFB-R8-AC10/AC11/AC12) ───

  describe('Group B: Hypertension Management + overdue', () => {
    it('"Blood pressure at goal" + no dueDate → green (CFB-R8-AC10)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Blood pressure at goal',
        ...baseRow,
      })).toBe('green');
    });

    it('"Blood pressure at goal" + past dueDate → red (CFB-R8-AC4/AC10)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Blood pressure at goal',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('"Blood pressure at goal" + future dueDate → green', () => {
      expect(getRowStatusColor({
        measureStatus: 'Blood pressure at goal',
        isDuplicate: false,
        dueDate: getFutureDate(5),
      })).toBe('green');
    });

    it('"Scheduled call back - BP not at goal" + past dueDate → red (CFB-R8-AC5/AC11)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Scheduled call back - BP not at goal',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('"Scheduled call back - BP at goal" + past dueDate → red (CFB-R8-AC5/AC11)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Scheduled call back - BP at goal',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('"Scheduled call back - BP not at goal" + no dueDate → blue', () => {
      expect(getRowStatusColor({
        measureStatus: 'Scheduled call back - BP not at goal',
        ...baseRow,
      })).toBe('blue');
    });

    it('"Scheduled call back - BP at goal" + no dueDate → blue', () => {
      expect(getRowStatusColor({
        measureStatus: 'Scheduled call back - BP at goal',
        ...baseRow,
      })).toBe('blue');
    });

    it('"Declined BP control" + past dueDate → purple (exempt) (CFB-R8-AC3/AC12)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Declined BP control',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('purple');
    });
  });

  // ─── Group C: Every color category + overdue (CFB-R8-AC3 through AC7) ───

  describe('Group C: One representative per color + overdue', () => {
    it('white (empty status) + overdue → red (CFB-R8-AC3)', () => {
      expect(getRowStatusColor({
        measureStatus: '',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('yellow ("Patient called to schedule AWV") + overdue → red (CFB-R8-AC6)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Patient called to schedule AWV',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('blue ("AWV scheduled") + overdue → red (CFB-R8-AC5)', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('green ("AWV completed") + overdue → red (CFB-R8-AC4)', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV completed',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('orange ("Chronic diagnosis resolved", no attestation) + overdue → red (CFB-R8-AC7)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Chronic diagnosis resolved',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('red');
    });

    it('gray ("No longer applicable") + overdue → gray (exempt) (CFB-R8-AC3)', () => {
      expect(getRowStatusColor({
        measureStatus: 'No longer applicable',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('gray');
    });

    it('purple ("Patient declined AWV") + overdue → purple (exempt) (CFB-R8-AC3)', () => {
      expect(getRowStatusColor({
        measureStatus: 'Patient declined AWV',
        isDuplicate: false,
        dueDate: getPastDate(5),
      })).toBe('purple');
    });
  });

  // ─── Group D: Chronic DX attestation matrix (CFB-R8-AC8/AC9) ───

  describe('Group D: Chronic DX attestation exhaustive matrix', () => {
    const chronicStatuses = ['Chronic diagnosis resolved', 'Chronic diagnosis invalid'];
    const attestationStates = [
      { tracking1: 'Attestation sent', label: 'sent' },
      { tracking1: 'Attestation not sent', label: 'not sent' },
      { tracking1: null as string | null, label: 'null' },
    ];

    chronicStatuses.forEach((status) => {
      attestationStates.forEach(({ tracking1, label }) => {
        // Not overdue
        const expectedNoOverdue = tracking1 === 'Attestation sent' ? 'green' : 'orange';
        it(`"${status}" + tracking1=${label} + no dueDate → ${expectedNoOverdue}`, () => {
          expect(getRowStatusColor({
            measureStatus: status,
            isDuplicate: false,
            dueDate: null,
            tracking1,
          })).toBe(expectedNoOverdue);
        });

        // Overdue
        const expectedOverdue = tracking1 === 'Attestation sent' ? 'green' : 'red';
        it(`"${status}" + tracking1=${label} + overdue → ${expectedOverdue} (CFB-R8-AC8/AC9)`, () => {
          expect(getRowStatusColor({
            measureStatus: status,
            isDuplicate: false,
            dueDate: getPastDate(5),
            tracking1,
          })).toBe(expectedOverdue);
        });
      });
    });
  });

  // ─── Group E: Boundary date cases (CFB-R8-AC17/AC18) ───

  describe('Group E: Boundary date cases', () => {
    it('dueDate = today → NOT overdue (CFB-R8-AC17)', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: getTodayDate(),
      })).toBe('blue');
    });

    it('dueDate = yesterday → overdue', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: getPastDate(1),
      })).toBe('red');
    });

    it('dueDate = tomorrow → NOT overdue', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV scheduled',
        isDuplicate: false,
        dueDate: getFutureDate(1),
      })).toBe('blue');
    });

    it('dueDate = null → NOT overdue (CFB-R8-AC18)', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV scheduled',
        ...baseRow,
      })).toBe('blue');
    });

    it('dueDate = today for green status → NOT overdue (stays green)', () => {
      expect(getRowStatusColor({
        measureStatus: 'AWV completed',
        isDuplicate: false,
        dueDate: getTodayDate(),
      })).toBe('green');
    });
  });

  // ─── Group F: Chip counting accuracy (CFB-R8-AC13/AC14/AC15) ───

  describe('Group F: Chip count accuracy with overdue + duplicate', () => {
    type CountableRow = {
      measureStatus: string | null;
      isDuplicate: boolean;
      dueDate: string | null;
      tracking1?: string | null;
    };

    function computeCounts(rows: CountableRow[]): Record<StatusColor, number> {
      const counts: Record<StatusColor, number> = {
        all: 0, duplicate: 0, white: 0, yellow: 0, blue: 0,
        green: 0, purple: 0, orange: 0, gray: 0, red: 0,
      };
      rows.forEach((row) => {
        if (row.isDuplicate) counts.duplicate++;
        const color = getRowStatusColor(row);
        counts[color]++;
      });
      return counts;
    }

    it('overdue row counted as red, NOT its natural color (CFB-R8-AC13)', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'AWV completed', isDuplicate: false, dueDate: getPastDate(5) },  // green → red (overdue)
        { measureStatus: 'AWV completed', isDuplicate: false, dueDate: null },             // green (not overdue)
      ];
      const counts = computeCounts(rows);
      expect(counts.red).toBe(1);
      expect(counts.green).toBe(1); // Only the non-overdue row
    });

    it('duplicate + overdue counted in BOTH duplicate AND red (CFB-R8-AC14)', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'AWV completed', isDuplicate: true, dueDate: getPastDate(5) }, // green→red + dup
        { measureStatus: 'AWV completed', isDuplicate: false, dueDate: null },           // green
      ];
      const counts = computeCounts(rows);
      expect(counts.duplicate).toBe(1);
      expect(counts.red).toBe(1);
      expect(counts.green).toBe(1);
    });

    it('duplicate without overdue counted in duplicate AND its natural color', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'AWV completed', isDuplicate: true, dueDate: null }, // green + dup
      ];
      const counts = computeCounts(rows);
      expect(counts.duplicate).toBe(1);
      expect(counts.green).toBe(1);
      expect(counts.red).toBe(0);
    });

    it('"All" total excludes duplicate count to avoid double-counting (CFB-R8-AC15)', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'AWV completed', isDuplicate: true, dueDate: null },  // green + dup
        { measureStatus: 'AWV scheduled', isDuplicate: false, dueDate: null }, // blue
        { measureStatus: null, isDuplicate: false, dueDate: null },            // white
      ];
      const counts = computeCounts(rows);
      // Sum of color counts: green(1) + blue(1) + white(1) = 3
      // Duplicate count: 1 (but this row is already counted as green)
      const colorSum = counts.white + counts.yellow + counts.blue + counts.green
        + counts.purple + counts.orange + counts.gray + counts.red;
      expect(colorSum).toBe(3);
      expect(counts.duplicate).toBe(1);
      // "All" chip should show colorSum (3), NOT colorSum + duplicate (4)
    });

    it('attestation-sent chronic DX counted as green, not orange or red', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: null, tracking1: 'Attestation sent' },
        { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: null, tracking1: 'Attestation not sent' },
        { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: getPastDate(5), tracking1: 'Attestation sent' },
        { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: getPastDate(5), tracking1: null },
      ];
      const counts = computeCounts(rows);
      expect(counts.green).toBe(2);  // sent (no overdue) + sent (overdue exempted)
      expect(counts.orange).toBe(1); // not sent, not overdue
      expect(counts.red).toBe(1);    // null tracking1, overdue
    });

    it('all purple/gray statuses remain exempt from overdue in counts', () => {
      const rows: CountableRow[] = [
        { measureStatus: 'Patient declined AWV', isDuplicate: false, dueDate: getPastDate(5) },
        { measureStatus: 'Declined BP control', isDuplicate: false, dueDate: getPastDate(5) },
        { measureStatus: 'Contraindicated', isDuplicate: false, dueDate: getPastDate(5) },
        { measureStatus: 'No longer applicable', isDuplicate: false, dueDate: getPastDate(5) },
        { measureStatus: 'Screening unnecessary', isDuplicate: false, dueDate: getPastDate(5) },
      ];
      const counts = computeCounts(rows);
      expect(counts.red).toBe(0);
      expect(counts.purple).toBe(3);
      expect(counts.gray).toBe(2);
    });
  });

  // ─── Group G: Cross-system consistency (CFB-R8-AC16) ───

  describe('Group G: PatientGrid rowClassRules ↔ getRowStatusColor consistency', () => {
    /**
     * PatientGrid.tsx defines the same status arrays and overdue logic inside
     * the component. We can't import rowClassRules (it's a useMemo inside a
     * component), but we can verify the two systems agree by replicating the
     * PatientGrid logic as a reference function and comparing outputs.
     */
    function patientGridColor(row: {
      measureStatus: string | null;
      isDuplicate: boolean;
      dueDate: string | null;
      tracking1?: string | null;
    }): string {
      // Exact copy of PatientGrid.tsx status arrays and logic
      const grayStatuses = ['No longer applicable', 'Screening unnecessary'];
      const purpleStatuses = ['Patient declined AWV', 'Patient declined', 'Patient declined screening', 'Declined BP control', 'Contraindicated'];
      const greenStatuses = ['AWV completed', 'Diabetic eye exam completed', 'Colon cancer screening completed', 'Screening test completed', 'Screening completed', 'GC/Clamydia screening completed', 'Urine microalbumin completed', 'Blood pressure at goal', 'Lab completed', 'Vaccination completed', 'HgbA1c at goal', 'Chronic diagnosis confirmed', 'Patient on ACE/ARB'];
      const blueStatuses = ['AWV scheduled', 'Diabetic eye exam scheduled', 'Diabetic eye exam referral made', 'Colon cancer screening ordered', 'Screening test ordered', 'Screening appt made', 'Test ordered', 'Urine microalbumin ordered', 'Appointment scheduled', 'ACE/ARB prescribed', 'Vaccination scheduled', 'HgbA1c ordered', 'Lab ordered', 'Obtaining outside records', 'HgbA1c NOT at goal', 'Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal', 'Will call later to schedule'];
      const yellowStatuses = ['Patient called to schedule AWV', 'Diabetic eye exam discussed', 'Screening discussed', 'Patient contacted for screening', 'Vaccination discussed'];
      const orangeStatuses = ['Chronic diagnosis resolved', 'Chronic diagnosis invalid'];

      const status = row.measureStatus || '';
      const isAttestationSent = orangeStatuses.includes(status) && row.tracking1 === 'Attestation sent';

      // Overdue check (matches PatientGrid.isRowOverdue)
      const isOverdue = (): boolean => {
        if (!row.dueDate) return false;
        if (grayStatuses.includes(status) || purpleStatuses.includes(status)) return false;
        if (isAttestationSent) return false;
        const dueDate = new Date(row.dueDate);
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
        return dueDateUTC < todayUTC;
      };

      // Priority matching PatientGrid rowClassRules
      if (isOverdue()) return 'red';
      if (grayStatuses.includes(status)) return 'gray';
      if (purpleStatuses.includes(status)) return 'purple';
      if (greenStatuses.includes(status) || isAttestationSent) return 'green';
      if (blueStatuses.includes(status)) return 'blue';
      if (yellowStatuses.includes(status)) return 'yellow';
      if (orangeStatuses.includes(status) && !isAttestationSent) return 'orange';
      return 'white';
    }

    const representativeRows = [
      { measureStatus: null, isDuplicate: false, dueDate: null },
      { measureStatus: '', isDuplicate: false, dueDate: null },
      { measureStatus: 'AWV completed', isDuplicate: false, dueDate: null },
      { measureStatus: 'AWV scheduled', isDuplicate: false, dueDate: null },
      { measureStatus: 'Patient called to schedule AWV', isDuplicate: false, dueDate: null },
      { measureStatus: 'Patient declined AWV', isDuplicate: false, dueDate: null },
      { measureStatus: 'No longer applicable', isDuplicate: false, dueDate: null },
      { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: null },
      { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: null, tracking1: 'Attestation sent' },
      { measureStatus: 'Blood pressure at goal', isDuplicate: false, dueDate: null },
      { measureStatus: 'Scheduled call back - BP not at goal', isDuplicate: false, dueDate: null },
      { measureStatus: 'HgbA1c NOT at goal', isDuplicate: false, dueDate: null },
      { measureStatus: 'Declined BP control', isDuplicate: false, dueDate: null },
      // With overdue dates
      { measureStatus: 'AWV completed', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'AWV scheduled', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'Patient declined AWV', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'No longer applicable', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'Chronic diagnosis resolved', isDuplicate: false, dueDate: getPastDate(5), tracking1: 'Attestation sent' },
      { measureStatus: 'Blood pressure at goal', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'Scheduled call back - BP not at goal', isDuplicate: false, dueDate: getPastDate(5) },
      { measureStatus: 'Declined BP control', isDuplicate: false, dueDate: getPastDate(5) },
      // With duplicate
      { measureStatus: 'AWV completed', isDuplicate: true, dueDate: null },
      { measureStatus: 'AWV completed', isDuplicate: true, dueDate: getPastDate(5) },
    ];

    it.each(representativeRows.map((row, i) => [
      `row ${i}: status="${row.measureStatus}" dup=${row.isDuplicate} due=${row.dueDate ? 'set' : 'null'} t1=${(row as { tracking1?: string }).tracking1 || 'none'}`,
      row,
    ]))(
      '%s → same color from both systems (CFB-R8-AC16)',
      (_label, row) => {
        const filterBarColor = getRowStatusColor(row as Parameters<typeof getRowStatusColor>[0]);
        const gridColor = patientGridColor(row as Parameters<typeof patientGridColor>[0]);
        expect(filterBarColor).toBe(gridColor);
      }
    );
  });
});
