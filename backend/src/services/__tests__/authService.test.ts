/**
 * Authentication Service Tests
 *
 * Tests for password hashing, JWT tokens, and user authentication functions.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  toAuthUser,
  isAccountLocked,
  generateTempPassword,
} from '../authService.js';
import type { User, UserRole } from '@prisma/client';

// Mock the config
jest.mock('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4, // Use lower rounds for faster tests
  },
}));

// Mock bcrypt hash with a simple implementation for testing
const originalBcryptHash = bcrypt.hash;
const originalBcryptCompare = bcrypt.compare;

describe('authService', () => {
  // hashPassword: bcrypt library tests removed (ln-630 audit B12.2)
  // Removed: 'valid bcrypt hash' ($2a$/$2b$ format), 'different hashes same password' (salt randomness),
  // 'different hashes different passwords' (library uniqueness). These test bcrypt, not our code.

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword123';
      const hash = await bcrypt.hash(password, 4);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await bcrypt.hash('correctPassword123', 4);

      const result = await verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await bcrypt.hash('password123', 4);

      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    // Removed: 'valid JWT token' (3-part format check) — tests jsonwebtoken library, not our code

    it('should include correct payload in token', () => {
      const user = {
        id: 42,
        email: 'doctor@clinic.com',
        roles: ['ADMIN'] as UserRole[],
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token) as { userId: number; email: string; roles: string[] };

      expect(decoded.userId).toBe(42);
      expect(decoded.email).toBe('doctor@clinic.com');
      expect(decoded.roles).toEqual(['ADMIN']);
    });

    it('should handle multiple roles in token', () => {
      const user = {
        id: 42,
        email: 'admin-doc@clinic.com',
        roles: ['ADMIN', 'PHYSICIAN'] as UserRole[],
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token) as { userId: number; email: string; roles: string[] };

      expect(decoded.roles).toEqual(['ADMIN', 'PHYSICIAN']);
    });

    // Removed: 'different tokens for different users' — tests JWT library uniqueness, not our code
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        roles: ['PHYSICIAN'] as UserRole[],
      };
      const token = generateToken(user);

      const payload = verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(1);
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.roles).toEqual(['PHYSICIAN']);
    });

    it('should return null for invalid token', () => {
      const payload = verifyToken('invalid.token.here');
      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const payload = verifyToken('not-a-jwt');
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      // Create token with different secret
      const token = jwt.sign(
        { userId: 1, email: 'test@test.com', roles: ['ADMIN'] },
        'different-secret',
        { expiresIn: '1h' }
      );

      const payload = verifyToken(token);
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token
      const token = jwt.sign(
        { userId: 1, email: 'test@test.com', roles: ['ADMIN'] },
        'test-secret-key',
        { expiresIn: '-1h' } // Already expired
      );

      const payload = verifyToken(token);
      expect(payload).toBeNull();
    });

    it('should return null for empty string', () => {
      const payload = verifyToken('');
      expect(payload).toBeNull();
    });
  });

  describe('toAuthUser', () => {
    it('should strip sensitive data from user', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'secret_hash_value',
        displayName: 'Test User',
        roles: ['PHYSICIAN'],
        isActive: true,
        lastLoginAt: new Date('2026-01-15'),
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-10'),
      };

      const authUser = toAuthUser(user);

      expect(authUser.id).toBe(1);
      expect(authUser.email).toBe('test@example.com');
      expect(authUser.displayName).toBe('Test User');
      expect(authUser.roles).toEqual(['PHYSICIAN']);
      expect(authUser.isActive).toBe(true);
      expect(authUser.lastLoginAt).toEqual(new Date('2026-01-15'));
      // Should not include sensitive data
      expect((authUser as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((authUser as unknown as Record<string, unknown>).createdAt).toBeUndefined();
      expect((authUser as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
    });

    it('should handle null lastLoginAt', () => {
      const user: User = {
        id: 2,
        email: 'newuser@example.com',
        passwordHash: 'hash',
        displayName: 'New User',
        roles: ['STAFF'],
        isActive: true,
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authUser = toAuthUser(user);

      expect(authUser.lastLoginAt).toBeNull();
    });

    it('should handle all role combinations', () => {
      const roleCombinations: UserRole[][] = [
        ['PHYSICIAN'],
        ['STAFF'],
        ['ADMIN'],
        ['ADMIN', 'PHYSICIAN'],
      ];

      roleCombinations.forEach((roles) => {
        const user: User = {
          id: 1,
          email: 'test@example.com',
          passwordHash: 'hash',
          displayName: 'Test',
          roles,
          isActive: true,
          lastLoginAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          mustChangePassword: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const authUser = toAuthUser(user);
        expect(authUser.roles).toEqual(roles);
      });
    });

    it('should handle inactive user', () => {
      const user: User = {
        id: 1,
        email: 'inactive@example.com',
        passwordHash: 'hash',
        displayName: 'Inactive User',
        roles: ['STAFF'],
        isActive: false,
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authUser = toAuthUser(user);

      expect(authUser.isActive).toBe(false);
    });
  });

  // ── isAccountLocked (pure function) ──────────────────────────────

  describe('isAccountLocked', () => {
    it('returns true when lockedUntil is in the future', () => {
      const futureDate = new Date(Date.now() + 60 * 1000);
      expect(isAccountLocked({ lockedUntil: futureDate })).toBe(true);
    });

    it('returns false when lockedUntil is in the past', () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      expect(isAccountLocked({ lockedUntil: pastDate })).toBe(false);
    });

    it('returns false when lockedUntil is null', () => {
      expect(isAccountLocked({ lockedUntil: null })).toBe(false);
    });

    it('returns false when lockedUntil is exactly now (boundary)', () => {
      // At exactly the current time, lock has expired
      const now = new Date();
      expect(isAccountLocked({ lockedUntil: now })).toBe(false);
    });
  });

  // ── generateTempPassword ──────────────────────────────────────────

  describe('generateTempPassword', () => {
    it('returns a 12-character string', () => {
      const password = generateTempPassword();
      expect(password).toHaveLength(12);
    });

    it('generates different passwords each time', () => {
      const p1 = generateTempPassword();
      const p2 = generateTempPassword();
      expect(p1).not.toBe(p2);
    });

    it('only contains allowed characters', () => {
      const allowed = /^[A-Za-z0-9!@#$%&*]+$/;
      for (let i = 0; i < 10; i++) {
        expect(generateTempPassword()).toMatch(allowed);
      }
    });
  });

  // Note: authenticateUser, sendTempPassword, findUserByEmail, updateLastLogin,
  // updatePassword, getStaffAssignments, isStaffAssignedToPhysician, getAllPhysicians,
  // incrementFailedAttempts, lockAccount, resetFailedAttempts are all thin Prisma
  // orchestration functions. Unit-testing them requires full prisma mocking which
  // tests the mock, not the code. These paths are covered by E2E login tests
  // and admin management E2E tests (see frontend/e2e/).
});
