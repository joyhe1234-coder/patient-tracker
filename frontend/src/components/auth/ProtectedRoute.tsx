import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      // If we have a token, verify it's still valid
      const token = localStorage.getItem('auth_token');
      if (token && !isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    verify();
  }, [checkAuth, isAuthenticated]);

  // Show loading spinner while checking auth
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access if specified
  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    // Redirect based on role
    if (user.roles.includes('ADMIN')) {
      return <Navigate to="/admin" replace />;
    }
    // PHYSICIAN and STAFF go to main page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
