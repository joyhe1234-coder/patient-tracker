import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/axios';

// User role type
export type UserRole = 'PHYSICIAN' | 'STAFF' | 'ADMIN';

// User info from backend
export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  canHavePatients: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

// Staff assignment (physicians a STAFF user can cover)
export interface StaffAssignment {
  physicianId: number;
  physicianName: string;
}

// Auth state
interface AuthState {
  // State
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  assignments: StaffAssignment[]; // For STAFF users
  selectedPhysicianId: number | null; // For STAFF users to switch between physicians

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSelectedPhysicianId: (physicianId: number | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      assignments: [],
      selectedPhysicianId: null,

      // Login action
      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token, assignments } = response.data.data;

          // Store token in localStorage for axios interceptor
          localStorage.setItem('auth_token', token);

          // Set default selected physician for STAFF and ADMIN
          let selectedPhysicianId: number | null = null;
          if ((user.role === 'STAFF' || user.role === 'ADMIN') && assignments && assignments.length > 0) {
            // Try to restore previous selection, or default to first
            const storedPhysicianId = localStorage.getItem('selectedPhysicianId');
            if (storedPhysicianId) {
              const id = parseInt(storedPhysicianId, 10);
              if (assignments.some((a: StaffAssignment) => a.physicianId === id)) {
                selectedPhysicianId = id;
              }
            }
            if (!selectedPhysicianId) {
              selectedPhysicianId = assignments[0].physicianId;
            }
          } else if (user.role === 'PHYSICIAN') {
            // PHYSICIAN always sees their own data
            selectedPhysicianId = user.id;
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            assignments: assignments || [],
            selectedPhysicianId,
          });

          return true;
        } catch (err: unknown) {
          const error = err as { response?: { data?: { error?: { message?: string } } } };
          const message = error.response?.data?.error?.message || 'Login failed';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
            assignments: [],
            selectedPhysicianId: null,
          });
          localStorage.removeItem('auth_token');
          return false;
        }
      },

      // Logout action
      logout: async (): Promise<void> => {
        const { token } = get();

        try {
          if (token) {
            await api.post('/auth/logout');
          }
        } catch {
          // Ignore errors on logout
        } finally {
          localStorage.removeItem('auth_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            assignments: [],
            selectedPhysicianId: null,
          });
        }
      },

      // Refresh user info from server
      refreshUser: async (): Promise<void> => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });

        try {
          const response = await api.get('/auth/me');
          const { user, assignments } = response.data.data;

          // Preserve or update selected physician
          let selectedPhysicianId = get().selectedPhysicianId;
          if ((user.role === 'STAFF' || user.role === 'ADMIN') && assignments && assignments.length > 0) {
            // Verify current selection is still valid
            if (!assignments.some((a: StaffAssignment) => a.physicianId === selectedPhysicianId)) {
              selectedPhysicianId = assignments[0].physicianId;
            }
          } else if (user.role === 'PHYSICIAN') {
            selectedPhysicianId = user.id;
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            assignments: assignments || [],
            selectedPhysicianId,
          });
        } catch {
          // Token invalid or expired, clear auth state
          localStorage.removeItem('auth_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            assignments: [],
            selectedPhysicianId: null,
          });
        }
      },

      // Set selected physician (for STAFF users)
      setSelectedPhysicianId: (physicianId: number | null): void => {
        set({ selectedPhysicianId: physicianId });
        if (physicianId !== null) {
          localStorage.setItem('selectedPhysicianId', physicianId.toString());
        } else {
          localStorage.removeItem('selectedPhysicianId');
        }
      },

      // Clear error message
      clearError: (): void => {
        set({ error: null });
      },

      // Check if user is authenticated (on app load)
      checkAuth: async (): Promise<boolean> => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }

        // Set token in state and verify it's still valid
        set({ token, isLoading: true });

        try {
          const response = await api.get('/auth/me');
          const { user, assignments } = response.data.data;

          // Restore or set default selected physician
          let selectedPhysicianId: number | null = null;
          if ((user.role === 'STAFF' || user.role === 'ADMIN') && assignments && assignments.length > 0) {
            const storedPhysicianId = localStorage.getItem('selectedPhysicianId');
            if (storedPhysicianId) {
              const id = parseInt(storedPhysicianId, 10);
              if (assignments.some((a: StaffAssignment) => a.physicianId === id)) {
                selectedPhysicianId = id;
              }
            }
            if (!selectedPhysicianId) {
              selectedPhysicianId = assignments[0].physicianId;
            }
          } else if (user.role === 'PHYSICIAN') {
            selectedPhysicianId = user.id;
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            assignments: assignments || [],
            selectedPhysicianId,
          });

          return true;
        } catch {
          // Token is invalid
          localStorage.removeItem('auth_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            assignments: [],
            selectedPhysicianId: null,
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist token - other state will be hydrated from server
      partialize: (state) => ({ token: state.token }),
    }
  )
);
