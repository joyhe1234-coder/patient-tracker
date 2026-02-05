/**
 * Authentication Routes Tests
 *
 * Tests for /api/auth endpoints: login validation.
 * Note: Full integration testing of authenticated routes is done via E2E Playwright tests,
 * as ESM module mocking with Jest has limitations for complex middleware chains.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

import authRouter from '../auth.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('auth routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login - Validation', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Tests for valid credentials, token generation, and audit logging
    // are covered by E2E Playwright tests due to ESM mocking limitations.
    // The following tests verify input validation which doesn't require mocking.
  });

  describe('POST /api/auth/logout - requires auth', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me - requires auth', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/password - requires auth', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'old', newPassword: 'newpassword123' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/smtp-status', () => {
    it('should return SMTP configuration status', async () => {
      const response = await request(app)
        .get('/api/auth/smtp-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configured');
      expect(typeof response.body.data.configured).toBe('boolean');
    });
  });

  describe('POST /api/auth/forgot-password - Validation', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Tests for actual email sending and token creation
    // require database mocking and are covered by E2E tests.
    // The endpoint always returns success message for security (doesn't reveal if email exists).
  });

  describe('POST /api/auth/reset-password - Validation', () => {
    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing newPassword', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: '', newPassword: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // Note: Tests for token validation, expiration, and password update
    // require database mocking and are covered by E2E tests.
  });
});
