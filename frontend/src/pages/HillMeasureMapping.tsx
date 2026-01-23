import { useState } from 'react';
import { Download } from 'lucide-react';
import { QUALITY_MEASURE_TO_STATUS } from '../config/dropdownConfig';

// Only include quality measures that have spreadsheet columns mapped (36 columns → 10 measures)
const MAPPED_MEASURES = [
  { requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
  { requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening' },
  { requestType: 'Screening', qualityMeasure: 'Colon Cancer Screening' },
  { requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening' },
  { requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam' },
  { requestType: 'Quality', qualityMeasure: 'Diabetes Control' },
  { requestType: 'Quality', qualityMeasure: 'Diabetic Nephropathy' },
  { requestType: 'Quality', qualityMeasure: 'GC/Chlamydia Screening' },
  { requestType: 'Quality', qualityMeasure: 'Hypertension Management' },
  { requestType: 'Quality', qualityMeasure: 'Vaccination' },
];

interface MappingRow {
  requestType: string;
  qualityMeasure: string;
  compliantMapsTo: string;
  nonCompliantMapsTo: string;
}

// Helper to find default "completed" status
function findCompletedStatus(statuses: string[]): string {
  const completed = statuses.find((s) => s.toLowerCase().includes('completed'));
  return completed || statuses[0] || '';
}

// Helper to find "Not Addressed" status
function findNotAddressedStatus(statuses: string[]): string {
  const notAddressed = statuses.find((s) => s === 'Not Addressed');
  return notAddressed || statuses[0] || '';
}

export default function HillMeasureMapping() {
  // Initialize with defaults
  const [mappings, setMappings] = useState<MappingRow[]>(() =>
    MAPPED_MEASURES.map(({ requestType, qualityMeasure }) => {
      const statuses = QUALITY_MEASURE_TO_STATUS[qualityMeasure] || [];
      return {
        requestType,
        qualityMeasure,
        compliantMapsTo: findCompletedStatus(statuses),
        nonCompliantMapsTo: findNotAddressedStatus(statuses),
      };
    })
  );

  // Update handler
  const updateMapping = (
    index: number,
    field: 'compliantMapsTo' | 'nonCompliantMapsTo',
    value: string
  ) => {
    setMappings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['requestType', 'qualityMeasure', 'compliantMapsTo', 'nonCompliantMapsTo'];
    const rows = mappings.map((m) =>
      [
        m.requestType,
        `"${m.qualityMeasure}"`,
        `"${m.compliantMapsTo}"`,
        `"${m.nonCompliantMapsTo}"`,
      ].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hill-measure-mapping-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">
          Hill Spreadsheet Quality Measure Mapping
        </h1>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 p-4 overflow-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                Request Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                Quality Measure
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                Compliant → Map To
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                Non Compliant → Map To
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((row, index) => {
              const statuses = QUALITY_MEASURE_TO_STATUS[row.qualityMeasure] || [];
              return (
                <tr key={row.qualityMeasure} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{row.requestType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{row.qualityMeasure}</td>
                  <td className="px-4 py-3">
                    <select
                      value={row.compliantMapsTo}
                      onChange={(e) => updateMapping(index, 'compliantMapsTo', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.nonCompliantMapsTo}
                      onChange={(e) => updateMapping(index, 'nonCompliantMapsTo', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
