import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatusFilterBar from './StatusFilterBar';

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
});
