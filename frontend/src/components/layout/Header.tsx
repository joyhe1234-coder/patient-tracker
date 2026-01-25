import { Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Patient Quality Measure Tracker
              </h1>
              <p className="text-sm text-gray-500">
                Track and manage patient quality measures
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-4 ml-8">
            <Link
              to="/"
              className={`text-sm font-medium ${
                location.pathname === '/'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Patient Grid
            </Link>
            <Link
              to="/hill-mapping"
              className={`text-sm font-medium ${
                location.pathname === '/hill-mapping'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Import Mapping
            </Link>
            <Link
              to="/import-test"
              className={`text-sm font-medium ${
                location.pathname === '/import-test'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Import Test
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator - will show lock status later */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Viewing Mode</span>
          </div>

          {/* Login button - will be functional in Phase 8 */}
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Login to Edit
          </button>
        </div>
      </div>
    </header>
  );
}
