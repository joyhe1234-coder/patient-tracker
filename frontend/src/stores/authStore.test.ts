/**
 * Auth Store Tests
 *
 * Tests for the Zustand auth store: state management, login/logout, and token handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios api - must be defined before vi.mock
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Import after mocking
import { useAuthStore, type AuthUser, type StaffAssignment } from './authStore';
import { api } from '../api/axios';

// Type the mocked api
const mockPost = vi.mocked(api.post);
const mockGet = vi.mocked(api.get);

describe('authStore', () => {
  // Clear store state and localStorage before each test
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      assignments: [],
      selectedPhysicianId: null,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.assignments).toEqual([]);
      expect(state.selectedPhysicianId).toBeNull();
    });
  });

  describe('login', () => {
    const mockPhysicianUser: AuthUser = {
      id: 1,
      email: 'doctor@clinic.com',
      displayName: 'Dr. Smith',
      role: 'PHYSICIAN',
      isActive: true,
      lastLoginAt: '2026-01-15T10:00:00Z',
    };

    const mockStaffUser: AuthUser = {
      id: 2,
      email: 'staff@clinic.com',
      displayName: 'Staff Member',
      role: 'STAFF',
      isActive: true,
      lastLoginAt: '2026-01-15T10:00:00Z',
    };

    const mockAssignments: StaffAssignment[] = [
      { physicianId: 1, physicianName: 'Dr. Smith' },
      { physicianId: 3, physicianName: 'Dr. Jones' },
    ];

    it('sets loading state during login', async () => {
      mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

      // Don't await - just start the login
      const loginPromise = useAuthStore.getState().login('test@test.com', 'password');

      // Check loading state was set
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isLoading).toBe(true);
      });

      // Cleanup
      mockPost.mockReset();
    });

    it('stores user and token on successful PHYSICIAN login', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            user: mockPhysicianUser,
            token: 'jwt-token-123',
          },
        },
      });

      const result = await useAuthStore.getState().login('doctor@clinic.com', 'password');

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockPhysicianUser);
      expect(state.token).toBe('jwt-token-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      // PHYSICIAN selectedPhysicianId is their own ID
      expect(state.selectedPhysicianId).toBe(1);
    });

    it('stores token in localStorage on successful login', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            user: mockPhysicianUser,
            token: 'jwt-token-123',
          },
        },
      });

      await useAuthStore.getState().login('doctor@clinic.com', 'password');

      expect(localStorage.getItem('auth_token')).toBe('jwt-token-123');
    });

    it('stores assignments for STAFF user', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            user: mockStaffUser,
            token: 'jwt-token-456',
            assignments: mockAssignments,
          },
        },
      });

      await useAuthStore.getState().login('staff@clinic.com', 'password');

      const state = useAuthStore.getState();
      expect(state.assignments).toEqual(mockAssignments);
      // Default to first assignment
      expect(state.selectedPhysicianId).toBe(1);
    });

    it('restores previous selectedPhysicianId for STAFF if valid', async () => {
      localStorage.setItem('selectedPhysicianId', '3');

      mockPost.mockResolvedValue({
        data: {
          data: {
            user: mockStaffUser,
            token: 'jwt-token-456',
            assignments: mockAssignments,
          },
        },
      });

      await useAuthStore.getState().login('staff@clinic.com', 'password');

      const state = useAuthStore.getState();
      expect(state.selectedPhysicianId).toBe(3);
    });

    it('defaults to first assignment if previous selection is invalid', async () => {
      localStorage.setItem('selectedPhysicianId', '999'); // Invalid

      mockPost.mockResolvedValue({
        data: {
          data: {
            user: mockStaffUser,
            token: 'jwt-token-456',
            assignments: mockAssignments,
          },
        },
      });

      await useAuthStore.getState().login('staff@clinic.com', 'password');

      const state = useAuthStore.getState();
      expect(state.selectedPhysicianId).toBe(1); // First assignment
    });

    it('sets error on failed login', async () => {
      mockPost.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Invalid email or password',
            },
          },
        },
      });

      const result = await useAuthStore.getState().login('wrong@test.com', 'wrong');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid email or password');
    });

    it('removes token from localStorage on failed login', async () => {
      localStorage.setItem('auth_token', 'old-token');

      mockPost.mockRejectedValue({
        response: {
          data: {
            error: { message: 'Login failed' },
          },
        },
      });

      await useAuthStore.getState().login('test@test.com', 'wrong');

      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('uses default error message if none provided', async () => {
      mockPost.mockRejectedValue({});

      await useAuthStore.getState().login('test@test.com', 'wrong');

      expect(useAuthStore.getState().error).toBe('Login failed');
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: 1, email: 'test@test.com', displayName: 'Test', role: 'PHYSICIAN', isActive: true, lastLoginAt: null },
        token: 'test-token',
        isAuthenticated: true,
        assignments: [],
        selectedPhysicianId: 1,
      });
      localStorage.setItem('auth_token', 'test-token');
    });

    it('clears auth state on logout', async () => {
      mockPost.mockResolvedValue({});

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.assignments).toEqual([]);
      expect(state.selectedPhysicianId).toBeNull();
    });

    it('removes token from localStorage', async () => {
      mockPost.mockResolvedValue({});

      await useAuthStore.getState().logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('calls logout endpoint', async () => {
      mockPost.mockResolvedValue({});

      await useAuthStore.getState().logout();

      expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    });

    it('clears state even if logout endpoint fails', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setSelectedPhysicianId', () => {
    it('updates selectedPhysicianId in state', () => {
      useAuthStore.getState().setSelectedPhysicianId(5);

      expect(useAuthStore.getState().selectedPhysicianId).toBe(5);
    });

    it('stores value in localStorage', () => {
      useAuthStore.getState().setSelectedPhysicianId(5);

      expect(localStorage.getItem('selectedPhysicianId')).toBe('5');
    });

    it('removes from localStorage when set to null', () => {
      localStorage.setItem('selectedPhysicianId', '5');

      useAuthStore.getState().setSelectedPhysicianId(null);

      expect(localStorage.getItem('selectedPhysicianId')).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error from state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('checkAuth', () => {
    const mockUser: AuthUser = {
      id: 1,
      email: 'doctor@clinic.com',
      displayName: 'Dr. Smith',
      role: 'PHYSICIAN',
      isActive: true,
      lastLoginAt: null,
    };

    it('returns false if no token in localStorage', async () => {
      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('verifies token and restores session if valid', async () => {
      localStorage.setItem('auth_token', 'valid-token');
      mockGet.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            assignments: [],
          },
        },
      });

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('valid-token');
    });

    it('clears state if token is invalid', async () => {
      localStorage.setItem('auth_token', 'invalid-token');
      mockGet.mockRejectedValue(new Error('Unauthorized'));

      const result = await useAuthStore.getState().checkAuth();

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('sets PHYSICIAN selectedPhysicianId to their own ID', async () => {
      localStorage.setItem('auth_token', 'valid-token');
      mockGet.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            assignments: [],
          },
        },
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().selectedPhysicianId).toBe(1);
    });
  });

  describe('refreshUser', () => {
    const mockUser: AuthUser = {
      id: 1,
      email: 'doctor@clinic.com',
      displayName: 'Dr. Smith Updated',
      role: 'PHYSICIAN',
      isActive: true,
      lastLoginAt: null,
    };

    it('does nothing if no token', async () => {
      useAuthStore.setState({ token: null });

      await useAuthStore.getState().refreshUser();

      expect(mockGet).not.toHaveBeenCalled();
    });

    it('updates user info from server', async () => {
      useAuthStore.setState({ token: 'valid-token' });
      mockGet.mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            assignments: [],
          },
        },
      });

      await useAuthStore.getState().refreshUser();

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('clears state if token becomes invalid', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: 1, email: 'test@test.com', displayName: 'Test', role: 'PHYSICIAN', isActive: true, lastLoginAt: null },
        isAuthenticated: true,
      });
      mockGet.mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().refreshUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
