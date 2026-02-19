import React, { useMemo } from 'react';
import { Check, Search, X } from 'lucide-react';

import { StatusColor, getRowStatusColor } from '../../config/statusColors';
export type { StatusColor };
export { getRowStatusColor };

interface StatusFilterBarProps {
  activeFilters: StatusColor[];
  onFilterChange: (filters: StatusColor[]) => void;
  rowCounts: Record<StatusColor, number>;
  searchText: string;
  onSearchChange: (text: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  selectedMeasure: string;
  onMeasureChange: (measure: string) => void;
  measureOptions: string[];
  selectedInsuranceGroup: string;
  onInsuranceGroupChange: (value: string) => void;
  insuranceGroupOptions: Array<{ id: string; name: string }>;
  pinnedRowId?: number | null;
  onUnpin?: () => void;
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

export default function StatusFilterBar({ activeFilters, onFilterChange, rowCounts, searchText, onSearchChange, searchInputRef, selectedMeasure, onMeasureChange, measureOptions, selectedInsuranceGroup, onInsuranceGroupChange, insuranceGroupOptions, pinnedRowId, onUnpin }: StatusFilterBarProps) {
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
      .filter(([key]) => key !== 'all' && key !== 'duplicate')
      .reduce((sum, [, count]) => sum + count, 0);
  }, [rowCounts]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-xs font-medium text-gray-600 mr-1">Filter:</span>
      {STATUS_CATEGORIES.map((category) => {
        const isActive = category.id === 'all' ? isAllSelected : activeFilters.includes(category.id);
        const count = category.id === 'all' ? totalRows : rowCounts[category.id] || 0;
        const isZeroCount = count === 0 && category.id !== 'all';

        return (
          <button
            key={category.id}
            onClick={() => handleChipClick(category.id)}
            aria-pressed={isActive}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
              border transition-all duration-150 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500
              ${isActive
                ? `${category.bgColor} ${category.textColor} ${category.borderColor}`
                : isZeroCount
                  ? `bg-white ${category.textColor} ${category.borderColor} opacity-50`
                  : `bg-white ${category.textColor} ${category.borderColor} opacity-50 hover:opacity-75`
              }
            `}
          >
            {isActive && <Check size={12} strokeWidth={3} />}
            <span>{category.label}</span>
            <span className="text-[10px] opacity-75">({count})</span>
          </button>
        );
      })}

      {/* New row pinned badge */}
      {pinnedRowId != null && (
        <button
          onClick={onUnpin}
          data-testid="pinned-row-badge"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium italic whitespace-nowrap bg-amber-100 text-amber-700 border border-amber-400 cursor-pointer hover:bg-amber-200 transition-colors"
        >
          New row pinned — click to unpin
        </button>
      )}

      {/* Vertical divider */}
      <div className="w-px h-5 bg-gray-300 mx-1 self-center" />

      {/* Quality Measure dropdown */}
      <select
        value={selectedMeasure}
        onChange={(e) => onMeasureChange(e.target.value)}
        aria-label="Filter by quality measure"
        className={`
          text-xs py-0.5 pl-1.5 pr-6 border rounded-md bg-white cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${selectedMeasure !== 'All Measures' ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-300'}
        `}
      >
        <option value="All Measures">All Measures</option>
        {measureOptions.map((measure) => (
          <option key={measure} value={measure}>{measure}</option>
        ))}
      </select>

      {/* Insurance Group dropdown */}
      <select
        value={selectedInsuranceGroup}
        onChange={(e) => onInsuranceGroupChange(e.target.value)}
        aria-label="Filter by insurance group"
        className={`
          text-xs py-0.5 pl-1.5 pr-6 border rounded-md bg-white cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${selectedInsuranceGroup !== 'all' ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-300'}
        `}
      >
        <option value="all">All</option>
        {insuranceGroupOptions.map((system) => (
          <option key={system.id} value={system.id}>{system.name}</option>
        ))}
        <option value="none">No Insurance</option>
      </select>

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

