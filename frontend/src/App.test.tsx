/**
 * App.tsx Routing Tests
 *
 * Tests that all routes (public, protected, admin-only, redirects, catch-all)
 * resolve to the correct page component.
 *
 * Strategy: Mock BrowserRouter as a pass-through so MemoryRouter controls
 * the location, then render the real App component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Mock BrowserRouter to pass-through (MemoryRouter provides the router context) ──
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ── Stub page components ──────────────────────────────────────────
vi.mock('./pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">LoginPage</div>,
}));

vi.mock('./pages/ForgotPasswordPage', () => ({
  ForgotPasswordPage: () => <div data-testid="forgot-password-page">ForgotPasswordPage</div>,
}));

vi.mock('./pages/ResetPasswordPage', () => ({
  ResetPasswordPage: () => <div data-testid="reset-password-page">ResetPasswordPage</div>,
}));

vi.mock('./pages/MainPage', () => ({
  default: () => <div data-testid="main-page">MainPage</div>,
}));

vi.mock('./pages/AdminPage', () => ({
  default: () => <div data-testid="admin-page">AdminPage</div>,
}));

vi.mock('./pages/PatientManagementPage', () => ({
  default: () => <div data-testid="patient-management-page">PatientManagementPage</div>,
}));

vi.mock('./pages/MappingManagementPage', () => ({
  MappingManagementPage: () => <div data-testid="import-mapping-page">MappingManagementPage</div>,
}));

vi.mock('./pages/ImportTestPage', () => ({
  default: () => <div data-testid="import-test-page">ImportTestPage</div>,
}));

vi.mock('./pages/ImportPreviewPage', () => ({
  default: () => <div data-testid="import-preview-page">ImportPreviewPage</div>,
}));

// ── Stub Header ───────────────────────────────────────────────────
vi.mock('./components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

// ── Stub ProtectedRoute — pass-through (renders children) ────────
vi.mock('./components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Import the actual App component (with mocks applied) ─────────
import App from './App';

function renderRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────

describe('App routing', () => {
  it('/login renders LoginPage', () => {
    renderRoute('/login');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('/forgot-password renders ForgotPasswordPage', () => {
    renderRoute('/forgot-password');
    expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
  });

  it('/ renders MainPage (catch-all protected route)', () => {
    renderRoute('/');
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });

  it('/admin renders AdminPage', () => {
    renderRoute('/admin');
    expect(screen.getByTestId('admin-page')).toBeInTheDocument();
  });

  it('/admin/import-mapping renders MappingManagementPage', () => {
    renderRoute('/admin/import-mapping');
    expect(screen.getByTestId('import-mapping-page')).toBeInTheDocument();
  });

  it('/import redirects to /patient-management', () => {
    renderRoute('/import');
    expect(screen.getByTestId('patient-management-page')).toBeInTheDocument();
  });

  it('/import/preview/123 redirects to /patient-management/preview/123', () => {
    renderRoute('/import/preview/123');
    expect(screen.getByTestId('import-preview-page')).toBeInTheDocument();
  });

  it('/reset-password renders ResetPasswordPage', () => {
    renderRoute('/reset-password');
    expect(screen.getByTestId('reset-password-page')).toBeInTheDocument();
  });

  it('/admin/patient-assignment redirects to /patient-management', () => {
    renderRoute('/admin/patient-assignment');
    expect(screen.getByTestId('patient-management-page')).toBeInTheDocument();
  });

  it('/patient-management renders PatientManagementPage directly', () => {
    renderRoute('/patient-management');
    expect(screen.getByTestId('patient-management-page')).toBeInTheDocument();
  });

  it('unknown route /xyz hits catch-all protected wrapper', () => {
    renderRoute('/xyz');
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
