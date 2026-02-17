import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/axios';
import { logger } from '../../utils/logger';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuthStore } from '../../stores/authStore';

export interface Physician {
  id: number;
  displayName: string;
  email: string;
  roles: string[];
}

export interface InvalidSheet {
  name: string;
  reason: string;
}

interface SheetsResponse {
  sheets: string[];
  totalSheets: number;
  filteredSheets: number;
  skippedSheets: string[];
  invalidSheets: InvalidSheet[];
}

export interface SheetSelectorProps {
  file: File;
  systemId: string;
  physicians: Physician[];
  onSelect: (sheetName: string, physicianId: number) => void;
  onError: (error: string) => void;
  invalidSheets?: InvalidSheet[];
}

/**
 * SheetSelector component for all import systems.
 *
 * Displays:
 * 1. A tab selector: dropdown if multiple valid tabs, text if single tab.
 * 2. A physician selector: dropdown for STAFF/ADMIN, auto-assigned for PHYSICIAN.
 * 3. Optional invalid sheets note (expandable).
 *
 * Once both a tab and physician are selected, it calls onSelect.
 */
export default function SheetSelector({
  file,
  systemId,
  physicians,
  onSelect,
  onError,
}: SheetSelectorProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [invalidSheetsData, setInvalidSheetsData] = useState<InvalidSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<number | null>(null);
  const [suggestedPhysicianId, setSuggestedPhysicianId] = useState<number | null>(null);
  const [showInvalidDetails, setShowInvalidDetails] = useState(false);

  // PHYSICIAN-only users get auto-assigned; ADMIN (even with PHYSICIAN) gets dropdown
  const isPhysicianRole = (user?.roles.includes('PHYSICIAN') && !user?.roles.includes('ADMIN')) ?? false;

  // Fetch sheet names on mount
  useEffect(() => {
    fetchSheets();
  }, [file, systemId]);

  // Auto-assign physician for PHYSICIAN role users
  useEffect(() => {
    if (isPhysicianRole && user && physicians.length > 0) {
      const matchingPhysician = physicians.find(p => p.id === user.id);
      if (matchingPhysician) {
        setSelectedPhysicianId(matchingPhysician.id);
      }
    }
  }, [isPhysicianRole, user, physicians]);

  const fetchSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', systemId);

      const response = await api.post('/import/sheets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const data: SheetsResponse = response.data.data;
        setSheets(data.sheets);
        setInvalidSheetsData(data.invalidSheets || []);

        // If exactly one tab, pre-select it
        if (data.sheets.length === 1) {
          const singleSheet = data.sheets[0];
          setSelectedSheet(singleSheet);
          if (!isPhysicianRole) {
            autoMatchPhysician(singleSheet);
          }
        }
      } else {
        const msg = response.data.error?.message || 'Failed to read workbook tabs';
        setError(msg);
        onError(msg);
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to read workbook tabs');
      setError(msg);
      onError(msg);
      logger.error('Sheet discovery failed:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-match a physician based on the selected tab name.
   *
   * Strategy: extract parts from the tab name (split on comma/space),
   * compare case-insensitively against each physician's displayName,
   * score by longest matching substring length, and pre-select the
   * highest scoring physician.
   */
  const autoMatchPhysician = useCallback(
    (tabName: string) => {
      if (!tabName || physicians.length === 0) {
        setSuggestedPhysicianId(null);
        return;
      }

      const tabLower = tabName.toLowerCase();
      // Split tab name into parts (e.g., "Smith, John" -> ["smith", "john"])
      const tabParts = tabLower
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      let bestScore = 0;
      let bestPhysicianId: number | null = null;

      for (const physician of physicians) {
        const displayLower = physician.displayName.toLowerCase();
        let score = 0;

        // Score by how many tab parts appear as substrings in the displayName
        for (const part of tabParts) {
          if (part.length >= 2 && displayLower.includes(part)) {
            score += part.length;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestPhysicianId = physician.id;
        }
      }

      if (bestPhysicianId !== null && bestScore >= 2) {
        setSuggestedPhysicianId(bestPhysicianId);
        setSelectedPhysicianId(bestPhysicianId);
      } else {
        setSuggestedPhysicianId(null);
      }
    },
    [physicians]
  );

  // When sheet changes, auto-match physician
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (!isPhysicianRole) {
      setSelectedPhysicianId(null);
      setSuggestedPhysicianId(null);
      if (sheetName) {
        autoMatchPhysician(sheetName);
      }
    }
  };

  // When physician changes
  const handlePhysicianChange = (physicianId: number | null) => {
    setSelectedPhysicianId(physicianId);
  };

  // Notify parent when both are selected
  useEffect(() => {
    if (selectedSheet && selectedPhysicianId !== null) {
      onSelect(selectedSheet, selectedPhysicianId);
    }
  }, [selectedSheet, selectedPhysicianId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Discovering workbook tabs...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-xl" aria-hidden="true">!</span>
          <div className="flex-1">
            <div className="font-medium text-red-800">Sheet Discovery Failed</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Get physician name for PHYSICIAN role auto-assign display
  const currentPhysicianName = isPhysicianRole && user
    ? physicians.find(p => p.id === user.id)?.displayName || user.displayName
    : null;

  return (
    <div className="space-y-5">
      {/* Tab Selector */}
      <div>
        <label
          htmlFor="sheet-selector"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Import Tab
        </label>
        {sheets.length === 1 ? (
          /* Single tab: show as static text */
          <div id="sheet-selector" role="status" className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 font-medium">
            Importing from: {sheets[0]}
          </div>
        ) : (
          /* Multiple tabs: show dropdown */
          <select
            id="sheet-selector"
            value={selectedSheet}
            onChange={(e) => handleSheetChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a tab --</option>
            {sheets.map((sheet) => (
              <option key={sheet} value={sheet}>
                {sheet}
              </option>
            ))}
          </select>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {sheets.length} valid tab{sheets.length !== 1 ? 's' : ''} found in
          workbook
        </p>
      </div>

      {/* Invalid Sheets Note */}
      {invalidSheetsData.length > 0 && (
        <div role="note" className="text-sm">
          <button
            onClick={() => setShowInvalidDetails(!showInvalidDetails)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowInvalidDetails(!showInvalidDetails);
              }
            }}
            className="text-gray-500 hover:text-gray-700 underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-expanded={showInvalidDetails}
          >
            {invalidSheetsData.length} tab{invalidSheetsData.length !== 1 ? 's' : ''} excluded: missing required import columns
          </button>
          {showInvalidDetails && (
            <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1">
              {invalidSheetsData.map((sheet) => (
                <div key={sheet.name} className="text-gray-600">
                  <span className="font-medium">{sheet.name}</span>: {sheet.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Physician Assignment */}
      {selectedSheet && (
        <div>
          <label
            htmlFor="physician-selector"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Assign to Physician
          </label>
          {isPhysicianRole && currentPhysicianName ? (
            /* PHYSICIAN role: auto-assigned, show as text */
            <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">
              Importing for: {currentPhysicianName}
            </div>
          ) : (
            /* STAFF/ADMIN: show physician dropdown */
            <>
              <select
                id="physician-selector"
                value={selectedPhysicianId ?? ''}
                onChange={(e) =>
                  handlePhysicianChange(
                    e.target.value ? parseInt(e.target.value, 10) : null
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a physician --</option>
                {physicians.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                    {suggestedPhysicianId === p.id ? ' (suggested)' : ''}
                  </option>
                ))}
              </select>
              {suggestedPhysicianId !== null && selectedPhysicianId === suggestedPhysicianId && (
                <p className="mt-1 text-sm text-blue-600">
                  Auto-matched from tab name. You can change this if needed.
                </p>
              )}
              {!selectedPhysicianId && (
                <p className="mt-1 text-sm text-amber-700" aria-live="polite">
                  Please select a physician to continue.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
