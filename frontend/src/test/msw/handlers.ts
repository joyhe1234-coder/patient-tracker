/**
 * MSW (Mock Service Worker) API Handlers
 *
 * Default request handlers for common API endpoints.
 * Tests can override these per-test using server.use().
 *
 * Usage in tests:
 *   import { server } from '../test/msw/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   // Override a handler for one test:
 *   server.use(
 *     http.get('/api/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }))
 *   );
 */

import { http, HttpResponse } from 'msw';

// --- Auth Endpoints ---

export const handlers = [
  // GET /api/auth/me — current user
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: {
        id: 1,
        email: 'admin@clinic.com',
        displayName: 'Admin User',
        roles: ['ADMIN'],
        mustChangePassword: false,
      },
    });
  }),

  // POST /api/auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email && body.password) {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: 1,
          email: body.email,
          displayName: 'Test User',
          roles: ['ADMIN'],
          mustChangePassword: false,
        },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  // POST /api/auth/forgot-password
  http.post('/api/auth/forgot-password', () => {
    return HttpResponse.json({ success: true, message: 'Reset email sent' });
  }),

  // POST /api/auth/reset-password
  http.post('/api/auth/reset-password', () => {
    return HttpResponse.json({ success: true, message: 'Password reset' });
  }),

  // POST /api/auth/change-password
  http.post('/api/auth/change-password', () => {
    return HttpResponse.json({ success: true });
  }),

  // --- Data Endpoints ---

  // GET /api/data/patients/:physicianId
  http.get('/api/data/patients/:physicianId', () => {
    return HttpResponse.json({ rows: [], columns: [] });
  }),

  // PATCH /api/data/patients/:id
  http.patch('/api/data/patients/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // POST /api/data/patients
  http.post('/api/data/patients', () => {
    return HttpResponse.json({
      id: 999,
      memberName: 'New Patient',
      memberDob: '1990-01-01',
    });
  }),

  // DELETE /api/data/patients/:id
  http.delete('/api/data/patients/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // --- Admin Endpoints ---

  // GET /api/admin/users
  http.get('/api/admin/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, email: 'admin@clinic.com', displayName: 'Admin', roles: ['ADMIN'], isActive: true },
      ],
    });
  }),

  // POST /api/admin/users
  http.post('/api/admin/users', () => {
    return HttpResponse.json({
      user: { id: 2, email: 'new@clinic.com', displayName: 'New User', roles: ['STAFF'], isActive: true },
    });
  }),

  // GET /api/admin/audit-log
  http.get('/api/admin/audit-log', () => {
    return HttpResponse.json({ entries: [] });
  }),

  // --- Physician Endpoints ---

  // GET /api/users/physicians
  http.get('/api/users/physicians', () => {
    return HttpResponse.json({
      physicians: [
        { id: 1, displayName: 'Dr. Smith' },
        { id: 2, displayName: 'Dr. Jones' },
      ],
    });
  }),

  // --- Import Endpoints ---

  // POST /api/import/sheets
  http.post('/api/import/sheets', () => {
    return HttpResponse.json({ sheets: ['Sheet1'] });
  }),

  // POST /api/import/preview
  http.post('/api/import/preview', () => {
    return HttpResponse.json({
      previewId: 'mock-preview-id',
      summary: { inserts: 5, updates: 2, skips: 0, duplicates: 0, deletes: 0 },
    });
  }),

  // GET /api/import/preview/:id
  http.get('/api/import/preview/:id', () => {
    return HttpResponse.json({
      previewId: 'mock-preview-id',
      systemId: 'hill',
      mode: 'merge',
      summary: { inserts: 5, updates: 2, skips: 0, duplicates: 0, deletes: 0 },
      changes: [],
    });
  }),

  // POST /api/import/apply/:id
  http.post('/api/import/apply/:id', () => {
    return HttpResponse.json({
      success: true,
      stats: { inserted: 5, updated: 2, skipped: 0, deleted: 0 },
    });
  }),

  // --- Column Mapping Endpoints ---

  // GET /api/import/mappings
  http.get('/api/import/mappings', () => {
    return HttpResponse.json({ mappings: [] });
  }),
];
