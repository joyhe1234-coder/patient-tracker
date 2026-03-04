/**
 * Health Routes Tests
 *
 * Tests for GET /api/health endpoint used by Render deployment
 * monitoring and post-deploy verification.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM module mocking).
 * No auth mock needed — health route is public.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  $queryRaw: jest.fn<any>(),
};

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: healthRouter } = await import('../health.routes.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use('/api/health', healthRouter);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Health Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  it('returns 200 with db connected when database is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('connected');
  });

  it('returns 503 with db disconnected when database query fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('error');
    expect(res.body.data.db).toBe('disconnected');
  });

  it('response includes timestamp and version fields', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app).get('/api/health');

    expect(res.body.data.timestamp).toBeDefined();
    // Verify timestamp is a valid ISO string
    expect(new Date(res.body.data.timestamp).toISOString()).toBe(res.body.data.timestamp);
    expect(res.body.data.version).toBeDefined();
    expect(typeof res.body.data.version).toBe('string');
  });
});
