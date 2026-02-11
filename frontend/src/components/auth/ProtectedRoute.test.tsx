/**
 * ProtectedRoute Tests
 *
 * Tests for the auth guard component: loading states, unauthenticated redirects,
 * role-based access control, and token verification behavior.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock auth store
const mockCheckAuth = vi.fn();
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null as { id: number; email: string; displayName: string; roles: string[]; isActive: boolean; lastLoginAt: null } | null,
  checkAuth: mockCheckAuth,
};

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthState),
  UserRole: {},
}));

import ProtectedRoute from './ProtectedRoute';

function renderWithRouter(
  children: React.ReactNode,
  { initialEntries = ['/protected'] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin" element={<div>Admin Page</div>} />
        <Route path="/" element={<div>Main Page</div>} />
        <Route path="/protected" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      checkAuth: mockCheckAuth,
    };
    // Simulate no token by default
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  it('shows loading spinner while checking authentication', () => {
    mockAuthState.isLoading = true;

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', async () => {
    mockCheckAuth.mockResolvedValue(false);

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'test@example.com',
      displayName: 'Test User',
      roles: ['PHYSICIAN'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('renders children when user has an allowed role', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles: ['ADMIN'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  it('redirects PHYSICIAN to / when admin-only route', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'doc@example.com',
      displayName: 'Doctor',
      roles: ['PHYSICIAN'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Admin Only</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Main Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('redirects ADMIN to /admin when physician-only route', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'admin@example.com',
      displayName: 'Admin',
      roles: ['ADMIN'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute allowedRoles={['PHYSICIAN']}>
        <div>Physician Only</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Physician Only')).not.toBeInTheDocument();
  });

  it('calls checkAuth when token exists but not authenticated', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('some-token');
    mockCheckAuth.mockResolvedValue(false);

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it('does not call checkAuth when already authenticated', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'test@example.com',
      displayName: 'Test',
      roles: ['PHYSICIAN'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('allows STAFF role when allowedRoles includes STAFF', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 1,
      email: 'staff@example.com',
      displayName: 'Staff User',
      roles: ['STAFF'],
      isActive: true,
      lastLoginAt: null,
    };

    renderWithRouter(
      <ProtectedRoute allowedRoles={['PHYSICIAN', 'STAFF']}>
        <div>Staff Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });
  });
});
