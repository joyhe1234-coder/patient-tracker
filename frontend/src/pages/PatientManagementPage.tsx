import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ImportTabContent } from './ImportPage';
import { ReassignTabContent } from './PatientAssignmentPage';

export default function PatientManagementPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'import';

  const isAdmin = user?.roles.includes('ADMIN');
  const validTabs = ['import', ...(isAdmin ? ['reassign'] : [])];
  const activeTab = validTabs.includes(rawTab) ? rawTab : 'import';

  const setTab = (tab: string) => {
    if (tab === 'import') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  useEffect(() => {
    document.title = activeTab === 'reassign'
      ? 'Patient Management - Reassign'
      : 'Patient Management - Import';
  }, [activeTab]);

  const tabs = [
    { id: 'import', label: 'Import Patients' },
    ...(isAdmin ? [{ id: 'reassign', label: 'Reassign Patients' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8" aria-label="Patient management tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div style={{ display: activeTab === 'import' ? 'block' : 'none' }}>
        <ImportTabContent />
      </div>
      {isAdmin && (
        <div style={{ display: activeTab === 'reassign' ? 'block' : 'none' }}>
          <ReassignTabContent isActive={activeTab === 'reassign'} />
        </div>
      )}
    </div>
  );
}
