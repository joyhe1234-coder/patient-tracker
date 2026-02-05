/**
 * Authentication Middleware Tests
 *
 * Tests for requireAuth, requireRole, optionalAuth, and requirePatientDataAccess middleware.
 *
 * Note: Due to ESM module mocking limitations with Jest, tests that require mocking
 * authService functions (verifyToken, findUserById) are covered by E2E Playwright tests.
 * These unit tests focus on header validation and role-based access control.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';

import { requireAuth, requireRole, optionalAuth, requirePatientDataAccess } from '../auth.js';

// Helper to create mock request
function createMockRequest(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Partial<Request>;
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  return {};
}

describe('auth middleware', () => {
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should call next with error when no authorization header', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await requireAuth(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error when authorization header does not start with Bearer', async () => {
      const req = createMockRequest('Basic abc123') as Request;
      const res = createMockResponse() as Response;

      await requireAuth(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error when Bearer token is empty', async () => {
      const req = createMockRequest('Bearer ') as Request;
      const res = createMockResponse() as Response;

      await requireAuth(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      // Empty token is still processed by verifyToken which returns null
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    // Note: Tests for invalid/expired tokens, user lookup, and deactivated users
    // are covered by E2E Playwright tests due to ESM mocking limitations.
  });

  describe('requireRole', () => {
    it('should call next with error when no user on request', () => {
      const req = { user: undefined } as Request;
      const res = createMockResponse() as Response;

      const middleware = requireRole(['ADMIN']);
      middleware(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('should call next with error when user has no matching roles', () => {
      const req = {
        user: { id: 1, email: 'staff@clinic.com', displayName: 'Staff', roles: ['STAFF'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      const middleware = requireRole(['ADMIN']);
      middleware(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      expect(error.message).toContain('Access denied');
      expect(error.statusCode).toBe(403);
    });

    it('should call next() when user has one of the allowed roles', () => {
      const req = {
        user: { id: 1, email: 'admin@clinic.com', displayName: 'Admin', roles: ['ADMIN'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      const middleware = requireRole(['ADMIN']);
      middleware(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called without error
    });

    it('should accept multiple allowed roles', () => {
      const req = {
        user: { id: 1, email: 'staff@clinic.com', displayName: 'Staff', roles: ['STAFF'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      const middleware = requireRole(['PHYSICIAN', 'STAFF', 'ADMIN']);
      middleware(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called without error
    });

    it('should allow access when user has any matching role from multiple roles', () => {
      const req = {
        user: { id: 1, email: 'admin-doc@clinic.com', displayName: 'Admin Doc', roles: ['ADMIN', 'PHYSICIAN'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      const middleware = requireRole(['PHYSICIAN']);
      middleware(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called without error - user has PHYSICIAN role
    });
  });

  describe('optionalAuth', () => {
    it('should continue without user when no authorization header', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await optionalAuth(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('should continue without user when authorization header is not Bearer', async () => {
      const req = createMockRequest('Basic abc123') as Request;
      const res = createMockResponse() as Response;

      await optionalAuth(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    // Note: Tests for token validation, user lookup, and user attachment
    // are covered by E2E Playwright tests due to ESM mocking limitations.
  });

  describe('requirePatientDataAccess', () => {
    it('should call next with error when no user on request', () => {
      const req = { user: undefined } as Request;
      const res = createMockResponse() as Response;

      requirePatientDataAccess(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = mockNext.mock.calls[0][0] as Error & { statusCode?: number };
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    it('should call next() for PHYSICIAN role', () => {
      const req = {
        user: { id: 1, email: 'doctor@clinic.com', displayName: 'Dr. Smith', roles: ['PHYSICIAN'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      requirePatientDataAccess(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() for STAFF role', () => {
      const req = {
        user: { id: 2, email: 'staff@clinic.com', displayName: 'Staff Member', roles: ['STAFF'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      requirePatientDataAccess(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() for ADMIN role', () => {
      const req = {
        user: { id: 3, email: 'admin@clinic.com', displayName: 'Admin', roles: ['ADMIN'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      requirePatientDataAccess(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() for ADMIN + PHYSICIAN roles', () => {
      const req = {
        user: { id: 4, email: 'admin-doc@clinic.com', displayName: 'Admin Doctor', roles: ['ADMIN', 'PHYSICIAN'] as UserRole[], isActive: true },
      } as Request;
      const res = createMockResponse() as Response;

      requirePatientDataAccess(req, res, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
