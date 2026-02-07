import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import AdminPage from './pages/AdminPage';
import PatientManagementPage from './pages/PatientManagementPage';
import HillMeasureMapping from './pages/HillMeasureMapping';
import ImportTestPage from './pages/ImportTestPage';
import ImportPreviewPage from './pages/ImportPreviewPage';
import Header from './components/layout/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Redirect helper for /import/preview/:previewId → /patient-management/preview/:previewId
function ImportPreviewRedirect() {
  const { previewId } = useParams();
  return <Navigate to={`/patient-management/preview/${previewId}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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

        {/* Redirects for old URLs */}
        <Route path="/admin/patient-assignment" element={<Navigate to="/patient-management?tab=reassign" replace />} />
        <Route path="/import" element={<Navigate to="/patient-management" replace />} />
        <Route path="/import/preview/:previewId" element={<ImportPreviewRedirect />} />

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
                    <Route path="/patient-management" element={<PatientManagementPage />} />
                    <Route path="/patient-management/preview/:previewId" element={<ImportPreviewPage />} />
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
