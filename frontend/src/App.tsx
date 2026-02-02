import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import HillMeasureMapping from './pages/HillMeasureMapping';
import ImportTestPage from './pages/ImportTestPage';
import ImportPage from './pages/ImportPage';
import ImportPreviewPage from './pages/ImportPreviewPage';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes (ADMIN only) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col">
                  <AdminPage />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Protected routes (all authenticated users) */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={['PHYSICIAN', 'STAFF', 'ADMIN']}>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col">
                  <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/hill-mapping" element={<HillMeasureMapping />} />
                    <Route path="/import-test" element={<ImportTestPage />} />
                    <Route path="/import" element={<ImportPage />} />
                    <Route path="/import/preview/:previewId" element={<ImportPreviewPage />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
