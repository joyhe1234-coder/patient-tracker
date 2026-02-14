import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { isSmtpConfigured, sendTempPasswordEmail } from './emailService.js';
import type { User, UserRole } from '@prisma/client';

// JWT payload structure
export interface JwtPayload {
  userId: number;
  email: string;
  roles: UserRole[];
}

// User info returned to frontend (without sensitive data)
export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  roles: UserRole[];
  isActive: boolean;
  lastLoginAt: Date | null;
}

// Staff assignment info
export interface StaffAssignment {
  physicianId: number;
  physicianName: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: Pick<User, 'id' | 'email' | 'roles'>): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    roles: user.roles,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find a user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

/**
 * Update user's password
 */
export async function updatePassword(userId: number, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/**
 * Get user info for frontend (without sensitive data)
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Get staff assignments (physicians a STAFF user can cover)
 */
export async function getStaffAssignments(staffId: number): Promise<StaffAssignment[]> {
  const assignments = await prisma.staffAssignment.findMany({
    where: { staffId },
    include: {
      physician: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return assignments.map((a) => ({
    physicianId: a.physician.id,
    physicianName: a.physician.displayName,
  }));
}

/**
 * Check if a STAFF user is assigned to a specific physician
 */
export async function isStaffAssignedToPhysician(staffId: number, physicianId: number): Promise<boolean> {
  const assignment = await prisma.staffAssignment.findUnique({
    where: {
      staffId_physicianId: {
        staffId,
        physicianId,
      },
    },
  });
  return assignment !== null;
}

/**
 * Get all users who can have patients assigned to them
 * This includes any user with PHYSICIAN in their roles array
 */
export async function getAllPhysicians(): Promise<StaffAssignment[]> {
  const users = await prisma.user.findMany({
    where: {
      roles: { has: 'PHYSICIAN' },
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
    },
    orderBy: {
      displayName: 'asc',
    },
  });

  return users.map((u) => ({
    physicianId: u.id,
    physicianName: u.displayName,
  }));
}

/**
 * Authenticate a user with email and password
 * Returns the user and token if successful, null otherwise
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string; assignments?: StaffAssignment[] } | null> {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  // Check if user is active
  if (!user.isActive) {
    return null;
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return null;
  }

  // Update last login
  await updateLastLogin(user.id);

  // Generate token
  const token = generateToken(user);

  // Get staff assignments if user is STAFF, or all physicians if ADMIN
  let assignments: StaffAssignment[] | undefined;
  if (user.roles.includes('STAFF')) {
    assignments = await getStaffAssignments(user.id);
  } else if (user.roles.includes('ADMIN')) {
    assignments = await getAllPhysicians();
  }

  return {
    user: toAuthUser(user),
    token,
    assignments,
  };
}

// ── Account lockout helpers ────────────────────────────────────────

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Increment failed login attempts for a user.
 * Returns the new count.
 */
export async function incrementFailedAttempts(userId: number): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });
  return user.failedLoginAttempts;
}

/**
 * Lock an account for 15 minutes.
 */
export async function lockAccount(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
  });
}

/**
 * Reset failed login attempts and clear lockout.
 */
export async function resetFailedAttempts(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

/**
 * Check if an account is currently locked.
 * Pure function — does not touch the database.
 */
export function isAccountLocked(user: { lockedUntil: Date | null }): boolean {
  if (!user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
}

/**
 * Generate a cryptographically secure temporary password.
 * 12 characters, alphanumeric + symbols.
 */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const bytes = crypto.randomBytes(12);
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Generate and set a temporary password for a user.
 * Unlocks the account, sets mustChangePassword flag, and emails if SMTP is configured.
 * Returns the temp password only when email was NOT sent (so admin can communicate it).
 */
export async function sendTempPassword(userId: number): Promise<{
  email: string;
  tempPassword: string | null;
  emailSent: boolean;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mustChangePassword: true,
    },
  });

  let emailSent = false;
  if (isSmtpConfigured()) {
    emailSent = await sendTempPasswordEmail(user.email, tempPassword);
  }

  return {
    email: user.email,
    tempPassword: emailSent ? null : tempPassword,
    emailSent,
  };
}
