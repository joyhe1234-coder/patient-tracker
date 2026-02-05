/**
 * LoginPage Tests
 *
 * Tests for the login page component: rendering, validation, and user interactions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth store state and actions
const mockLogin = vi.fn();
const mockClearError = vi.fn();

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  })),
}));

import LoginPage from './LoginPage';
import { useAuthStore } from '../stores/authStore';

// Helper to render with router
function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      user: null,
      token: null,
      assignments: [],
      selectedPhysicianId: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      setSelectedPhysicianId: vi.fn(),
      checkAuth: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders the login form', () => {
      renderLoginPage();

      expect(screen.getByText('Patient Quality Measure Tracker')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access the patient tracking system')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders email input with correct placeholder', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('you@example.com');
      expect(emailInput).toBeInTheDocument();
    });

    it('renders password input with correct placeholder', () => {
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toBeInTheDocument();
    });

    it('renders admin contact message', () => {
      renderLoginPage();

      expect(screen.getByText(/contact your administrator/i)).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    // Note: HTML5 form validation with `required` attributes and `type="email"`
    // prevents form submission before our JavaScript validation runs.
    // We test that login is not called when fields are empty.

    it('does not call login when email is empty', async () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      // HTML5 validation prevents submission
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('does not call login when password is empty', async () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      // HTML5 validation prevents submission
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('does not call login when both fields are empty', async () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // HTML5 validation prevents submission
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Login flow', () => {
    it('calls login with email and password on valid submit', async () => {
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'doctor@clinic.com');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('doctor@clinic.com', 'password123');
      });
    });

    it('trims whitespace from email', async () => {
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, '  doctor@clinic.com  ');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('doctor@clinic.com', 'password123');
      });
    });

    it('navigates to home on successful login', async () => {
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await userEvent.type(emailInput, 'doctor@clinic.com');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Error display', () => {
    it('displays error message from auth store', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: false,
        error: 'Invalid credentials',
        clearError: mockClearError,
        user: null,
        token: null,
        assignments: [],
        selectedPhysicianId: null,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setSelectedPhysicianId: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderLoginPage();

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading text when isLoading is true', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        clearError: mockClearError,
        user: null,
        token: null,
        assignments: [],
        selectedPhysicianId: null,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setSelectedPhysicianId: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderLoginPage();

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });

    it('disables inputs when loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        clearError: mockClearError,
        user: null,
        token: null,
        assignments: [],
        selectedPhysicianId: null,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setSelectedPhysicianId: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderLoginPage();

      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  describe('Password visibility toggle', () => {
    it('initially hides password', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('shows password when toggle is clicked', async () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = passwordInput.parentElement?.querySelector('button');

      expect(toggleButton).toBeInTheDocument();
      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    it('hides password again when toggle is clicked twice', async () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = passwordInput.parentElement?.querySelector('button');

      if (toggleButton) {
        fireEvent.click(toggleButton);
        fireEvent.click(toggleButton);
      }

      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Redirect when authenticated', () => {
    it('redirects to home when already authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        clearError: mockClearError,
        user: { id: 1, email: 'test@test.com', displayName: 'Test', role: 'PHYSICIAN', isActive: true, lastLoginAt: null },
        token: 'token',
        assignments: [],
        selectedPhysicianId: 1,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setSelectedPhysicianId: vi.fn(),
        checkAuth: vi.fn(),
      });

      renderLoginPage();

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
