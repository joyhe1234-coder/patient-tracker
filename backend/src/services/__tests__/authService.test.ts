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
  describe('hashPassword', () => {
    it('should return a valid bcrypt hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');

      expect(hash1).not.toBe(hash2);
    });
  });

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
    it('should generate a valid JWT token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        roles: ['PHYSICIAN'] as UserRole[],
      };

      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

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

    it('should generate different tokens for different users', () => {
      const user1 = { id: 1, email: 'user1@test.com', roles: ['PHYSICIAN'] as UserRole[] };
      const user2 = { id: 2, email: 'user2@test.com', roles: ['STAFF'] as UserRole[] };

      const token1 = generateToken(user1);
      const token2 = generateToken(user2);

      expect(token1).not.toBe(token2);
    });
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authUser = toAuthUser(user);

      expect(authUser.isActive).toBe(false);
    });
  });
});
