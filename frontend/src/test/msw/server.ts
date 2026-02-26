/**
 * MSW Server for Vitest
 *
 * Sets up a mock server that intercepts HTTP requests during tests.
 * Import this in your test files to use MSW instead of vi.mock('axios').
 *
 * Setup (already done in test/setup.ts):
 *   - Server starts before all tests
 *   - Handlers reset after each test (per-test overrides don't leak)
 *   - Server closes after all tests
 *
 * Per-test overrides:
 *   import { server } from '../test/msw/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   test('handles error', () => {
 *     server.use(
 *       http.get('/api/auth/me', () => HttpResponse.json({ error: 'fail' }, { status: 500 }))
 *     );
 *     // ... test code
 *   });
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
