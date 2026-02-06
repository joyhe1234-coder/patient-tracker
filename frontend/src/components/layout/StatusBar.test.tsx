import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBar from './StatusBar';

describe('StatusBar', () => {
  it('shows "Showing X of Y rows" when filtered', () => {
    render(<StatusBar rowCount={25} totalRowCount={100} />);
    expect(screen.getByText('Showing 25 of 100 rows')).toBeInTheDocument();
  });

  it('shows "Showing X of X rows" when not filtered (consistent format)', () => {
    render(<StatusBar rowCount={100} totalRowCount={100} />);
    expect(screen.getByText('Showing 100 of 100 rows')).toBeInTheDocument();
  });

  it('shows "Showing X of X rows" when totalRowCount is undefined', () => {
    render(<StatusBar rowCount={50} />);
    expect(screen.getByText('Showing 50 of 50 rows')).toBeInTheDocument();
  });

  it('formats large numbers with locale separators', () => {
    render(<StatusBar rowCount={1500} totalRowCount={10000} />);
    expect(screen.getByText(/Showing 1,500 of 10,000 rows/)).toBeInTheDocument();
  });

  it('shows zero rows correctly', () => {
    render(<StatusBar rowCount={0} totalRowCount={100} />);
    expect(screen.getByText('Showing 0 of 100 rows')).toBeInTheDocument();
  });

  it('shows Connected status', () => {
    render(<StatusBar rowCount={10} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
