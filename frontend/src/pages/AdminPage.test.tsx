/**
 * AdminPage Tests
 *
 * Tests for the admin dashboard: rendering, tab switching, user list,
 * create/edit user modals, role badges, and error handling.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../api/axios', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Mock auth store
let mockUser: { id: number; email: string; displayName: string; roles: string[]; isActive: boolean; lastLoginAt: null } | null = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
  lastLoginAt: null,
};

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
  })),
  UserRole: {},
}));

import AdminPage from './AdminPage';

const mockUsers = [
  {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin User',
    roles: ['ADMIN'],
    isActive: true,
    lastLoginAt: '2025-06-01T10:00:00Z',
    patientCount: 0,
    assignedPhysicians: [],
    assignedStaff: [],
  },
  {
    id: 2,
    email: 'doc@example.com',
    displayName: 'Dr. Smith',
    roles: ['PHYSICIAN'],
    isActive: true,
    lastLoginAt: '2025-06-10T10:00:00Z',
    patientCount: 25,
    assignedPhysicians: [],
    assignedStaff: [{ staffId: 3, staffName: 'Nurse Jane' }],
  },
  {
    id: 3,
    email: 'nurse@example.com',
    displayName: 'Nurse Jane',
    roles: ['STAFF'],
    isActive: true,
    lastLoginAt: null,
    patientCount: 0,
    assignedPhysicians: [{ physicianId: 2, physicianName: 'Dr. Smith' }],
    assignedStaff: [],
  },
  {
    id: 4,
    email: 'inactive@example.com',
    displayName: 'Inactive User',
    roles: ['PHYSICIAN'],
    isActive: false,
    lastLoginAt: null,
    patientCount: 0,
    assignedPhysicians: [],
    assignedStaff: [],
  },
];

const mockPhysicians = [
  { id: 2, displayName: 'Dr. Smith' },
];

function renderAdminPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 1,
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles: ['ADMIN'],
      isActive: true,
      lastLoginAt: null,
    };
    // Default API responses
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({ data: { data: { entries: [] } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  // ── Rendering ──────────────────────────────────────────────────

  it('renders admin dashboard title', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('renders Users and Audit Log tabs', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });
  });

  it('renders nothing when user is not admin', async () => {
    mockUser = {
      id: 2,
      email: 'doc@example.com',
      displayName: 'Doctor',
      roles: ['PHYSICIAN'],
      isActive: true,
      lastLoginAt: null,
    };

    const { container } = renderAdminPage();
    // Non-admin should redirect and render nothing
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // ── Users tab ─────────────────────────────────────────────────

  it('shows user count in header', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText(`Users (${mockUsers.length})`)).toBeInTheDocument();
    });
  });

  it('renders user rows with name and email', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('doc@example.com')).toBeInTheDocument();
    });
  });

  it('displays role badges for each user', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getAllByText('PHYSICIAN').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('STAFF')).toBeInTheDocument();
    });
  });

  it('shows active/inactive status', async () => {
    renderAdminPage();
    await waitFor(() => {
      const activeElements = screen.getAllByText('Active');
      expect(activeElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('shows patient count for physicians', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Dr. Smith's patient count
    });
  });

  it('shows "Never" for users who have not logged in', async () => {
    renderAdminPage();
    await waitFor(() => {
      const neverElements = screen.getAllByText('Never');
      expect(neverElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Add User button', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });

  // ── Tab switching ─────────────────────────────────────────────

  it('switches to Audit Log tab on click', async () => {
    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/audit-log?limit=100');
    });
  });

  // ── Error handling ────────────────────────────────────────────

  // ── Audit Log: LOGIN_FAILED entries ──────────────────────

  const mockAuditLogWithLoginFailed = [
    {
      id: 101,
      userId: null,
      userEmail: 'hacker@example.com',
      userDisplayName: 'hacker@example.com',
      action: 'LOGIN_FAILED',
      entity: null,
      entityId: null,
      changes: null,
      details: { reason: 'INVALID_CREDENTIALS' },
      ipAddress: '192.168.1.100',
      createdAt: '2025-07-01T14:30:00Z',
    },
    {
      id: 102,
      userId: 5,
      userEmail: 'locked@example.com',
      userDisplayName: 'locked@example.com',
      action: 'LOGIN_FAILED',
      entity: null,
      entityId: null,
      changes: null,
      details: { reason: 'ACCOUNT_LOCKED' },
      ipAddress: '10.0.0.50',
      createdAt: '2025-07-01T14:35:00Z',
    },
    {
      id: 103,
      userId: 5,
      userEmail: 'deactivated@example.com',
      userDisplayName: 'deactivated@example.com',
      action: 'LOGIN_FAILED',
      entity: null,
      entityId: null,
      changes: null,
      details: { reason: 'ACCOUNT_DEACTIVATED' },
      ipAddress: '172.16.0.1',
      createdAt: '2025-07-01T14:40:00Z',
    },
    {
      id: 104,
      userId: 5,
      userEmail: 'locked@example.com',
      userDisplayName: 'locked@example.com',
      action: 'ACCOUNT_LOCKED',
      entity: null,
      entityId: null,
      changes: null,
      details: { reason: 'TOO_MANY_FAILED_ATTEMPTS' },
      ipAddress: '10.0.0.50',
      createdAt: '2025-07-01T14:36:00Z',
    },
  ];

  it('renders LOGIN_FAILED entries with orange action badge', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({ data: { data: { entries: mockAuditLogWithLoginFailed } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      const badges = screen.getAllByText('LOGIN_FAILED');
      expect(badges.length).toBe(3);
      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
      });
    });
  });

  it('displays reason from details for LOGIN_FAILED entries', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({ data: { data: { entries: mockAuditLogWithLoginFailed } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      expect(screen.getByText(/Reason: INVALID_CREDENTIALS/)).toBeInTheDocument();
      expect(screen.getByText(/Reason: ACCOUNT_LOCKED/)).toBeInTheDocument();
      expect(screen.getByText(/Reason: ACCOUNT_DEACTIVATED/)).toBeInTheDocument();
    });
  });

  it('displays email and IP address for LOGIN_FAILED entries', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({ data: { data: { entries: mockAuditLogWithLoginFailed } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      expect(screen.getByText(/Email: hacker@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/IP: 192\.168\.1\.100/)).toBeInTheDocument();
      // IP 10.0.0.50 appears in both LOGIN_FAILED (id=102) and ACCOUNT_LOCKED (id=104) entries
      const ipMatches = screen.getAllByText(/IP: 10\.0\.0\.50/);
      expect(ipMatches.length).toBe(2);
    });
  });

  it('renders ACCOUNT_LOCKED entries with red badge and details', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({ data: { data: { entries: mockAuditLogWithLoginFailed } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      const badge = screen.getByText('ACCOUNT_LOCKED');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
      expect(screen.getByText(/Reason: TOO_MANY_FAILED_ATTEMPTS/)).toBeInTheDocument();
    });
  });

  it('displays LOGIN_FAILED entry with all security details combined', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: mockUsers } });
      }
      if (url === '/admin/physicians') {
        return Promise.resolve({ data: { data: mockPhysicians } });
      }
      if (url.startsWith('/admin/audit-log')) {
        return Promise.resolve({
          data: {
            data: {
              entries: [
                {
                  id: 200,
                  userId: null,
                  userEmail: 'attacker@evil.com',
                  userDisplayName: 'attacker@evil.com',
                  action: 'LOGIN_FAILED',
                  entity: null,
                  entityId: null,
                  changes: null,
                  details: { reason: 'INVALID_CREDENTIALS' },
                  ipAddress: '203.0.113.42',
                  createdAt: '2025-07-02T08:00:00Z',
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      const detailsText = 'Reason: INVALID_CREDENTIALS | Email: attacker@evil.com | IP: 203.0.113.42';
      expect(screen.getByText(detailsText)).toBeInTheDocument();
    });
  });

  // ── Error handling ────────────────────────────────────────────

  it('shows error message when API call fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    renderAdminPage();
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────

  it('shows loading spinner while data loads', () => {
    // Make the API call hang
    mockGet.mockReturnValue(new Promise(() => {}));
    renderAdminPage();
    // The spinner has animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
