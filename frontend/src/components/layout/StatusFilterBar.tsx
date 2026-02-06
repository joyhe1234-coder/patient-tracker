import React, { useMemo } from 'react';
import { Check, Search, X } from 'lucide-react';

// Status color categories matching PatientGrid row class rules
export type StatusColor = 'all' | 'duplicate' | 'white' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'red';

interface StatusFilterBarProps {
  activeFilters: StatusColor[];
  onFilterChange: (filters: StatusColor[]) => void;
  rowCounts: Record<StatusColor, number>;
  searchText: string;
  onSearchChange: (text: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

// Status category definitions
const STATUS_CATEGORIES: Array<{
  id: StatusColor;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = [
  { id: 'all', label: 'All', bgColor: 'bg-white', textColor: 'text-gray-700', borderColor: 'border-gray-400' },
  { id: 'duplicate', label: 'Duplicates', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-500' },
  { id: 'white', label: 'Not Addressed', bgColor: 'bg-white', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
  { id: 'red', label: 'Overdue', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-400' },
  { id: 'blue', label: 'In Progress', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-400' },
  { id: 'yellow', label: 'Contacted', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-400' },
  { id: 'green', label: 'Completed', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-400' },
  { id: 'purple', label: 'Declined', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-400' },
  { id: 'orange', label: 'Resolved', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-400' },
  { id: 'gray', label: 'N/A', bgColor: 'bg-gray-200', textColor: 'text-gray-600', borderColor: 'border-gray-400' },
];

export default function StatusFilterBar({ activeFilters, onFilterChange, rowCounts, searchText, onSearchChange, searchInputRef }: StatusFilterBarProps) {
  const isAllSelected = activeFilters.includes('all') || activeFilters.length === 0;

  const handleChipClick = (id: StatusColor) => {
    // "All" clears everything
    if (id === 'all') {
      onFilterChange(['all']);
      return;
    }

    // "Duplicates" is exclusive — toggle it
    if (id === 'duplicate') {
      if (activeFilters.includes('duplicate')) {
        onFilterChange(['all']);
      } else {
        onFilterChange(['duplicate']);
      }
      return;
    }

    // Status color chip — multi-select toggle
    let newFilters: StatusColor[];

    if (activeFilters.includes('all') || activeFilters.includes('duplicate')) {
      // Coming from All or Duplicates → start fresh with just this chip
      newFilters = [id];
    } else if (activeFilters.includes(id)) {
      // Toggle OFF — remove this chip
      newFilters = activeFilters.filter((f) => f !== id);
      // If nothing left, fall back to All
      if (newFilters.length === 0) {
        newFilters = ['all'];
      }
    } else {
      // Toggle ON — add this chip
      newFilters = [...activeFilters, id];
    }

    onFilterChange(newFilters);
  };

  const totalRows = useMemo(() => {
    return Object.entries(rowCounts)
      .filter(([key]) => key !== 'all')
      .reduce((sum, [, count]) => sum + count, 0);
  }, [rowCounts]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-sm font-medium text-gray-600 mr-2">Filter:</span>
      {STATUS_CATEGORIES.map((category) => {
        const isActive = category.id === 'all' ? isAllSelected : activeFilters.includes(category.id);
        const count = category.id === 'all' ? totalRows : rowCounts[category.id] || 0;

        return (
          <button
            key={category.id}
            onClick={() => handleChipClick(category.id)}
            aria-pressed={isActive}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              border-2 transition-all duration-150 cursor-pointer
              ${isActive
                ? `${category.bgColor} ${category.textColor} ${category.borderColor}`
                : `bg-white ${category.textColor} ${category.borderColor} opacity-50 hover:opacity-75`
              }
            `}
          >
            {isActive && <Check size={14} strokeWidth={3} />}
            <span>{category.label}</span>
            <span className="text-xs opacity-75">({count})</span>
          </button>
        );
      })}

      {/* Search input */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearchChange('');
              e.currentTarget.blur();
            }
          }}
          placeholder="Search by name..."
          aria-label="Search patients by name"
          className="w-64 pl-8 pr-8 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchText && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function to determine the status color of a row
// This matches the logic in PatientGrid.tsx rowClassRules
export function getRowStatusColor(row: {
  measureStatus: string | null;
  isDuplicate: boolean;
  dueDate: string | null;
}): Exclude<StatusColor, 'all'> {
  const grayStatuses = ['No longer applicable', 'Screening unnecessary'];
  const purpleStatuses = ['Patient declined AWV', 'Patient declined', 'Patient declined screening', 'Declined BP control', 'Contraindicated'];
  const greenStatuses = ['AWV completed', 'Diabetic eye exam completed', 'Colon cancer screening completed', 'Screening test completed', 'Screening completed', 'GC/Clamydia screening completed', 'Urine microalbumin completed', 'Blood pressure at goal', 'Lab completed', 'Vaccination completed', 'HgbA1c at goal', 'Chronic diagnosis confirmed', 'Patient on ACE/ARB'];
  const blueStatuses = ['AWV scheduled', 'Diabetic eye exam scheduled', 'Diabetic eye exam referral made', 'Colon cancer screening ordered', 'Screening test ordered', 'Screening appt made', 'Test ordered', 'Urine microalbumin ordered', 'Appointment scheduled', 'ACE/ARB prescribed', 'Vaccination scheduled', 'HgbA1c ordered', 'Lab ordered', 'Obtaining outside records', 'HgbA1c NOT at goal', 'Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal', 'Will call later to schedule'];
  const yellowStatuses = ['Patient called to schedule AWV', 'Diabetic eye exam discussed', 'Screening discussed', 'Patient contacted for screening', 'Vaccination discussed'];
  const orangeStatuses = ['Chronic diagnosis resolved', 'Chronic diagnosis invalid'];

  const status = row.measureStatus || '';

  // Check overdue first
  // Applies to all statuses EXCEPT declined (purple), N/A (gray), and resolved (orange)
  // Completed (green) statuses CAN be overdue - indicates need for new annual measure
  const isOverdue = (): boolean => {
    if (!row.dueDate) return false;
    // Don't show overdue for declined/N/A/resolved statuses
    if (grayStatuses.includes(status) || purpleStatuses.includes(status) ||
        orangeStatuses.includes(status)) {
      return false;
    }
    const dueDate = new Date(row.dueDate);
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    return dueDateUTC < todayUTC;
  };

  // Priority: overdue > status-based colors (duplicate handled separately via isDuplicate flag)
  if (isOverdue()) return 'red';
  if (grayStatuses.includes(status)) return 'gray';
  if (purpleStatuses.includes(status)) return 'purple';
  if (greenStatuses.includes(status)) return 'green';
  if (blueStatuses.includes(status)) return 'blue';
  if (yellowStatuses.includes(status)) return 'yellow';
  if (orangeStatuses.includes(status)) return 'orange';

  return 'white'; // Default - Not Addressed
}
